import { supabase } from '../config/supabase';
import * as bcrypt from 'bcryptjs';
import { userService } from './user.service';

interface LoginInput {
    phone: string;
    context: 'hauze' | 'pro' | 'tenant' | 'admin' | 'portal';
}

interface VerifyInput {
    phone: string;
    otp?: string;
    password?: string;
    context: 'hauze' | 'pro' | 'tenant' | 'admin' | 'portal';
    tenant_slug?: string;
}

export class AuthService {
    async sendOtp(input: LoginInput) {
        // MOCK OTP Logic
        // In production: Send SMS via provider
        console.log(`[Mock SMS] Sending OTP to ${input.phone} for context ${input.context}: 123456`);
        return { otp_sent: true, mock_code: '123456' };
    }

    async verifyOtp(input: VerifyInput, signJwt: (payload: any, options?: any) => string) {
        const { phone, otp, password, context, tenant_slug: inputTenantSlug } = input;

        let userId: string | undefined;

        // 1. Authenticate
        if (password) {
            // Pasword Login (Custom Auth)

            // Resolve Tenant ID
            let tenantId: string | undefined;

            if (inputTenantSlug) {
                // Look up tenant by slug
                const { data: tenant, error: tenantError } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('slug', inputTenantSlug)
                    .single();

                if (tenantError || !tenant) {
                    throw new Error('Mağaza bulunamadı.');
                }
                tenantId = tenant.id;
            } else if (context !== 'pro' && context !== 'hauze' && context !== 'admin' && context !== 'portal') {
                // If context is a subdomain (e.g. 'tenantA'), try to find it
                // Actually 'context' passed from frontend might be just 'pro' or 'portal' usually.
                // The frontend should pass 'tenant_slug' explicitly if on pro.localhost.
                // If on tenant.localhost, frontend passes that as context?
                // Let's assume input.tenant_slug is the primary way.
            }

            // If we still don't have tenantId, and context is PRO/PORTAL, we need it.
            // Unless it's a Super Admin Global Login? (Not supported yet per user req).
            if (!tenantId) {
                // Try to see if phone belongs to ANY tenant? 
                // User said: "Tenantın zaten bir kullanıcı adı olduğuna göre login formu bu şekilde revize edebiliriz."
                // So we MUST have tenant_slug.
                throw new Error('Lütfen Mağaza Adını giriniz.');
            }

            // Fetch user password hash scoped by Tenant
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, password_hash')
                .eq('phone', phone)
                .eq('tenant_id', tenantId)
                .single();

            if (userError || !user) {
                console.error('[AuthService] User Lookup Failed:', userError);
                throw new Error('Giriş başarısız. Kullanıcı veya Mağaza hatalı.');
            }

            if (!user.password_hash) {
                throw new Error('Giriş için şifre ayarlanmamış.');
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                console.warn('[AuthService] Invalid Password for user:', user.id);
                throw new Error('Giriş başarısız. Şifre hatalı.');
            }

            userId = user.id;
        } else {
            // Mock OTP (Fallback or Legacy)
            if (otp !== '123456') {
                throw new Error('Invalid OTP');
            }
            // For OTP, we find the user by phone
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('phone', phone)
                .single();

            userId = user?.id;

            // Auto-create only for OTP flow
            if (!userId) {
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({ phone })
                    .select()
                    .single();

                if (createError || !newUser) throw new Error('Failed to create user');
                userId = newUser.id;
            }
        }

        if (!userId) throw new Error('User not found');

        // 3. Resolve Context Specifics
        let tenant_id = undefined;
        let role = undefined;
        let tenant_slug = undefined;
        let is_super_admin = false;
        let permissions = {};

        console.log(`[AuthService] Verifying for UserID: ${userId}, Context: ${context}`);

        if (context === 'pro') {
            // Check if user is a member of any tenant
            const { data: membership, error: memError } = await supabase
                .from('tenant_users')
                .select('tenant_id, role, is_super_admin, can_inventory, can_finance, can_orders, can_personnel, can_depo, can_go, can_portal, can_web, tenants(status, slug, subscription_features)')
                .eq('user_id', userId)
                .single();

            if (memError) {
                console.error('[AuthService] Membership Lookup Error:', memError);
            }
            console.log('[AuthService] Membership Data:', JSON.stringify(membership, null, 2));

            if (!membership) {
                console.error('[AuthService] User has no active tenant membership. user_id:', userId);
                throw new Error('User has no active tenant membership');
            }

            // Check Tenant Status
            // @ts-ignore - Supabase types might not fully know the join yet
            const tenantStatus = membership.tenants?.status;
            if (tenantStatus === 'suspended') throw new Error('Tenant suspended');

            tenant_id = membership.tenant_id;
            role = membership.role;
            // @ts-ignore
            tenant_slug = membership.tenants?.slug;
            // @ts-ignore
            const tenant_features = membership.tenants?.subscription_features || {};

            is_super_admin = membership.is_super_admin;
            permissions = {
                can_inventory: membership.can_inventory && (tenant_features.inventory !== false),
                can_finance: membership.can_finance && (tenant_features.finance !== false),
                can_orders: membership.can_orders && (tenant_features.orders !== false),
                can_personnel: membership.can_personnel && (tenant_features.personnel !== false),
                can_depo: membership.can_depo && (tenant_features.inventory !== false), // Depo usually tied to Inventory
                can_go: membership.can_go && (tenant_features.go === true),
                can_portal: membership.can_portal && (tenant_features.portal === true),
                can_web: membership.can_web && (tenant_features.web === true),
            };

            // Add features_config to permissions or separate object?
            // Let's add it to the user object response below.
            (permissions as any)._tenant_features = tenant_features;

        } else if (context === 'portal') {
            // Personnel Portal Context
            const { data: contact, error: pError } = await supabase
                .from('contacts')
                .select('id, tenant_id, portal_access, tenants(slug)')
                .eq('user_id', userId)
                .eq('type', 'personnel')
                .eq('portal_access', true)
                .maybeSingle();

            if (pError || !contact) {
                console.error('[AuthService] Portal Access Denied:', pError);
                throw new Error('Personel portal erişim yetkiniz bulunmamaktadır.');
            }

            tenant_id = contact.tenant_id;
            role = 'personnel';
            // @ts-ignore
            tenant_slug = contact.tenants?.slug;
        }

        // 4. Generate Tokens
        const payload = {
            uid: userId,
            context,
            tenant_id,
            role,
            is_super_admin,
        };

        const accessToken = signJwt(payload, { expiresIn: '1y' });
        const refreshToken = signJwt({ ...payload, type: 'refresh' }, { expiresIn: '1y' });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: userId,
                phone,
                role,
                tenant_id,
                tenant_slug,
                is_super_admin,
                permissions
            }
        };
    }

    async refreshToken(token: string, verifyJwt: (token: string) => any, signJwt: (payload: any, options?: any) => string) {
        // 1. Verify Refresh Token
        const decoded = verifyJwt(token);

        if (!decoded || decoded.type !== 'refresh') {
            throw new Error('Invalid refresh token');
        }

        // 2. Check if User/Tenant is still active (Security Check)
        // Re-use logic from verifyOtp or simplified check
        const { uid, context } = decoded;

        // Fetch fresh user data
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .single();

        if (!user) throw new Error('User not found');

        // Re-resolve context (to ensure role/status didn't change)
        let tenant_id = undefined;
        let role = undefined;
        let tenant_slug = undefined;
        let is_super_admin = false;
        let permissions = {};

        if (context === 'pro') {
            const { data: membership } = await supabase
                .from('tenant_users')
                .select('tenant_id, role, is_super_admin, can_inventory, can_finance, can_orders, can_personnel, can_depo, can_go, can_portal, can_web, tenants(status, slug, subscription_features)')
                .eq('user_id', uid)
                .single();

            if (!membership) throw new Error('Membership revoked');

            // @ts-ignore
            if (membership.tenants?.status === 'suspended') throw new Error('Tenant suspended');

            tenant_id = membership.tenant_id;
            role = membership.role;
            // @ts-ignore
            tenant_slug = membership.tenants?.slug;
            // @ts-ignore
            const tenant_features = membership.tenants?.subscription_features || {};

            is_super_admin = membership.is_super_admin;
            permissions = {
                can_inventory: membership.can_inventory && (tenant_features.inventory !== false),
                can_finance: membership.can_finance && (tenant_features.finance !== false),
                can_orders: membership.can_orders && (tenant_features.orders !== false),
                can_personnel: membership.can_personnel && (tenant_features.personnel !== false),
                can_depo: membership.can_depo && (tenant_features.inventory !== false),
                can_go: membership.can_go && (tenant_features.go === true),
                can_portal: membership.can_portal && (tenant_features.portal === true),
                can_web: membership.can_web && (tenant_features.web === true),
            };
            (permissions as any)._tenant_features = tenant_features;

        } else if (context === 'portal') {
            const { data: contact } = await supabase
                .from('contacts')
                .select('tenant_id, portal_access, tenants(slug)')
                .eq('user_id', uid)
                .eq('type', 'personnel')
                .eq('portal_access', true)
                .maybeSingle();

            if (!contact) throw new Error('Portal access revoked');
            tenant_id = contact.tenant_id;
            role = 'personnel';
            // @ts-ignore
            tenant_slug = contact.tenants?.slug;
        }

        // 3. Issue New Tokens
        const payload = {
            uid,
            context,
            tenant_id,
            role,
            is_super_admin,
            // @ts-ignore
            tenant_slug: tenant_slug // Re-use resolved tenant_slug
        };

        const newAccessToken = signJwt(payload, { expiresIn: '1y' });
        const newRefreshToken = signJwt({ ...payload, type: 'refresh' }, { expiresIn: '1y' });

        return {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            user: {
                id: uid,
                phone: user.phone,
                role,
                tenant_id,
                tenant_slug,
                is_super_admin,
                permissions
            }
        };
    }

    async registerCustomer(
        input: { tenant_slug: string, name: string, phone: string, password: string },
        signJwt: (payload: any, options: any) => string
    ) {
        const { tenant_slug, name, phone, password } = input;

        // 1. Resolve Tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', tenant_slug)
            .single();

        if (tenantError || !tenant) {
            throw new Error('Mağaza bulunamadı.');
        }

        // 2. Create User
        const { user } = await userService.createCustomerUser(tenant.id, { name, phone, password });

        if (!user) throw new Error('Kullanıcı oluşturulamadı.');

        // 3. Generate Token
        const payload = {
            uid: user.id,
            context: 'tenant',
            tenant_id: tenant.id,
            role: 'customer',
            is_super_admin: false,
            tenant_slug: tenant_slug
        };

        const token = signJwt(payload, { expiresIn: '7d' });
        const refreshToken = signJwt({ ...payload, type: 'refresh' }, { expiresIn: '7d' });

        return {
            access_token: token,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                phone: user.phone,
                role: 'customer',
                name: name,
                tenant_id: tenant.id,
                tenant_slug: tenant_slug
            }
        };
    }
}

export const authService = new AuthService();
