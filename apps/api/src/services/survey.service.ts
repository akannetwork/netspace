import { supabase } from '../config/supabase';
import crypto from 'crypto';

export class SurveyService {
    /**
     * Generates a unique survey link for an order
     */
    async generateSurvey(tenantId: string, orderId: string) {
        // 1. Get Order/Contact Info
        const { data: order, error: oError } = await supabase
            .from('orders')
            .select('contact_id')
            .eq('id', orderId)
            .single();

        if (oError || !order) throw new Error('Order not found');

        // 2. Check if a survey already exists for this order
        const { data: existing } = await supabase
            .from('surveys')
            .select('token')
            .eq('order_id', orderId)
            .maybeSingle();

        if (existing) return { token: existing.token };

        // 3. Generate Token and Record
        const token = crypto.randomUUID();
        const { error } = await supabase
            .from('surveys')
            .insert({
                tenant_id: tenantId,
                order_id: orderId,
                contact_id: order.contact_id,
                token,
                status: 'pending'
            });

        if (error) throw error;
        return { token };
    }

    /**
     * Get survey info by token (Public)
     */
    async getStoreByToken(token: string) {
        const { data, error } = await supabase
            .from('surveys')
            .select('*, tenants(name)')
            .eq('token', token)
            .single();

        if (error || !data) throw new Error('Geçersiz anket bağlantısı');
        if (data.status === 'completed') throw new Error('Bu anket zaten tamamlanmış');

        return data;
    }

    /**
     * Submit survey feedback
     */
    async submitFeedback(token: string, score: number, comment?: string) {
        const { error } = await supabase
            .from('surveys')
            .update({
                score,
                comment,
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('token', token)
            .eq('status', 'pending');

        if (error) throw error;
        return { success: true };
    }

    /**
     * Get Survey Report for office
     */
    async getSurveyReport(tenantId: string) {
        const { data, error } = await supabase
            .from('surveys')
            .select('*, contacts(name)')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });

        if (error) throw error;
        return data;
    }
}

export const surveyService = new SurveyService();
