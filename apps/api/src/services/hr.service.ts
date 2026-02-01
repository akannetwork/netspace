import { supabase } from '../config/supabase';

export interface TimesheetInput {
    personnel_id: string;
    date: string; // YYYY-MM-DD
    status: 'present' | 'absent' | 'leave' | 'late';
    multiplier?: number;
    description?: string;
}

export class HRService {

    /**
     * Delete timesheet entry (Reset to empty/undefined)
     */
    async deleteTimesheet(tenantId: string, personnelId: string, date: string) {
        console.log(`[HRService] deleteTimesheet called: personnelId=${personnelId}, date=${date}`);

        // 1. Find Timesheet ID
        const { data: timesheet } = await supabase
            .from('timesheets')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('personnel_id', personnelId)
            .eq('date', date)
            .maybeSingle();

        const tsId = timesheet?.id;
        console.log(`[HRService] Found timesheet ID: ${tsId}`);

        // 2. Delete Timesheet
        const { error } = await supabase
            .from('timesheets')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('personnel_id', personnelId)
            .eq('date', date);

        if (error) throw error;

        // 3. Sync Transactions (Clear for this day)
        await this.syncDailyTransaction(tenantId, personnelId, date, 0, tsId);

        // 4. Recalculate Balance (Source of Truth)
        console.log(`[HRService] About to recalculate balance for ${personnelId}`);
        await this.recalculateBalance(personnelId);

        return { success: true };
    }

    /**
     * Bulk Upsert Timesheets
     */
    async upsertTimesheetsBulk(tenantId: string, inputs: TimesheetInput[]) {
        const results = [];
        for (const input of inputs) {
            try {
                const res = await this.upsertTimesheet(tenantId, input);
                results.push({ ...input, success: true, data: res });
            } catch (error) {
                console.error('Bulk Upsert Error for:', input, error);
                results.push({ ...input, success: false, error });
            }
        }
        return results;
    }

    /**
     * Upsert a timesheet entry
     */
    async upsertTimesheet(tenantId: string, input: TimesheetInput) {
        // 1. Upsert Timesheet
        const { data: timesheet, error } = await supabase
            .from('timesheets')
            .upsert({
                tenant_id: tenantId,
                personnel_id: input.personnel_id,
                date: input.date,
                status: input.status,
                multiplier: input.multiplier || 1.0,
                description: input.description,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'personnel_id, date'
            })
            .select()
            .maybeSingle();

        if (error) throw error;

        // 2. Auto-Accrual Check
        const { data: person } = await supabase
            .from('contacts')
            .select('salary_type, daily_rate')
            .eq('id', input.personnel_id)
            .single();

        if (person && (person.salary_type === 'daily' || person.salary_type === 'hybrid')) {
            const dailyRate = Number(person.daily_rate || 0);
            const multiplier = Number(input.multiplier || 1.0);

            let earnedAmount = 0;
            // User Rules:
            // Present: Daily Rate * Multiplier (1x or 2x etc)
            // Late: Daily Rate * 0.5
            // Leave: Neutral (0)

            if (input.status === 'present') {
                earnedAmount = dailyRate * multiplier;
            } else if (input.status === 'late') {
                earnedAmount = dailyRate * 0.5;
            } else if (input.status === 'leave') {
                earnedAmount = 0;
            }

            // 3. Sync Transaction
            await this.syncDailyTransaction(tenantId, input.personnel_id, input.date, earnedAmount, timesheet.id);

            // 4. Recalculate Balance
            await this.recalculateBalance(input.personnel_id);
        }

        return timesheet;
    }

    /**
     * Private Helper: Syncs transaction state for a specific day.
     */
    private async syncDailyTransaction(tenantId: string, personnelId: string, date: string, amount: number, timesheetId?: string) {
        let query = supabase
            .from('transactions')
            .select('id, amount, created_at')
            .eq('contact_id', personnelId) // Changed from personnel_id
            .ilike('description', `%${date}%`);

        if (timesheetId) {
            query = query.or(`reference_id.eq.${timesheetId},description.ilike.%${date}%`);
        }

        const { data: trxs } = await query;
        const candidates = trxs || [];

        if (amount > 0) {
            let originalCreatedAt = new Date().toISOString();

            if (candidates.length > 0) {
                originalCreatedAt = candidates[0].created_at || originalCreatedAt;
                const idsToDelete = candidates.map(t => t.id);
                await supabase.from('transactions').delete().in('id', idsToDelete);
            }

            await supabase.from('transactions').insert({
                tenant_id: tenantId,
                contact_id: personnelId, // Changed from personnel_id
                type: 'credit', // Alacak (Personel alacakli)
                category: 'salary',
                amount: amount,
                description: `Puantaj Hak ediş: ${date}`,
                reference_id: timesheetId,
                created_at: originalCreatedAt
            });

        } else {
            if (candidates.length > 0) {
                const idsToDelete = candidates.map(t => t.id);
                await supabase.from('transactions').delete().in('id', idsToDelete);
            }
        }
    }

    /**
     * Private Helper: Recalculates and updates the total balance for a contact.
     * UNIFIED LOGIC for ALL contact types (Customer, Personnel, Supplier, etc.)
     * - Debit = +balance (they owe us / borçlandırma)
     * - Credit = -balance (they paid / tahsilat/ödeme)
     */
    private async recalculateBalance(personnelId: string) {
        const { data: trxs } = await supabase
            .from('transactions')
            .select('id, amount, type, description, category')
            .eq('contact_id', personnelId);

        console.log(`[HRService] recalculateBalance: Found ${trxs?.length || 0} transactions for ${personnelId}`);

        let balance = 0;
        if (trxs) {
            trxs.forEach(t => {
                const amount = Number(t.amount);
                // UNIFIED: Debit = + (they owe more), Credit = - (they owe less)
                if (t.type === 'debit') {
                    balance += amount;
                    console.log(`  [+] Debit ${amount} (${t.category}/${t.description}) -> running balance: ${balance}`);
                } else {
                    balance -= amount;
                    console.log(`  [-] Credit ${amount} (${t.category}/${t.description}) -> running balance: ${balance}`);
                }
            });
        }

        console.log(`[HRService] FINAL balance for ${personnelId}: ${balance}`);
        await supabase.from('contacts').update({ balance }).eq('id', personnelId);
    }

    /**
     * Get monthly timesheets for a person
     */
    async getTimesheets(tenantId: string, personnelId: string, month: number, year: number) {
        // Construct date range
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        // Calculate end date (first day of next month)
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('personnel_id', personnelId)
            .gte('date', startDate)
            .lt('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Get ALL timesheets for a tenant (filtered by month)
     */
    async getTimesheetsByTenant(tenantId: string, month: number, year: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('date', startDate)
            .lt('date', endDate);

        if (error) throw error;
        return data;
    }

    /**
     * Get Payroll Summary (Calculated)
     */
    async getPayrollSummary(tenantId: string, personnelId: string, month: number, year: number) {
        // 1. Get Personnel Details from CONTACTS
        const { data: person, error: personError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', personnelId)
            .eq('tenant_id', tenantId)
            .single();

        if (personError) throw personError;
        if (!person) throw new Error('Personel bulunamadı');

        // 2. Get Timesheets
        const sheets = await this.getTimesheets(tenantId, personnelId, month, year);

        // 3. Calculate
        let totalEarnings = 0;
        let daysWorked = 0;

        if (person.salary_type === 'monthly' || person.salary_type === 'hybrid') {
            totalEarnings += Number(person.base_salary || 0);
        }

        if (person.salary_type === 'daily' || person.salary_type === 'hybrid') {
            const dailyRate = person.daily_rate || 0;

            sheets?.forEach(day => {
                if (day.status === 'present' || day.status === 'late') {
                    const multiplier = day.multiplier || 1.0;
                    totalEarnings += (dailyRate * multiplier);
                    daysWorked += (1 * multiplier);
                }
            });
        }

        return {
            personnel: person,
            salary_type: person.salary_type,
            base_salary: person.base_salary,
            daily_rate: person.daily_rate,
            days_worked: daysWorked,
            total_earnings: totalEarnings,
            currency: 'TRY'
        };
    }
}

export const hrService = new HRService();
