
import { supabase } from '../config/supabase';

export interface ServiceConfig {
    [attributeName: string]: any; // e.g. { "Kağıt": "300gr", "Genişlik": 210, "Yükseklik": 297 }
}

export class ServiceService {
    /**
     * Get the full configuration template for a service
     */
    async getServiceTemplate(productId: string) {
        const { data: attributes, error } = await supabase
            .from('service_attributes')
            .select(`
                *,
                options:service_attribute_options(*)
            `)
            .eq('product_id', productId)
            .order('order_index');

        if (error) throw error;

        const { data: quantitySteps } = await supabase
            .from('service_quantity_steps')
            .select('*')
            .eq('product_id', productId)
            .order('min_quantity');

        const { data: product } = await supabase
            .from('products')
            .select('name, price, pricing_model, unit')
            .eq('id', productId)
            .single();

        return { product, attributes, quantitySteps };
    }

    /**
     * The Core Pricing Engine
     */
    async calculatePrice(productId: string, config: ServiceConfig, quantity: number) {
        // 1. Fetch Product and its Pricing Model
        const { data: product, error: pError } = await supabase
            .from('products')
            .select('price, pricing_model, unit')
            .eq('id', productId)
            .single();

        if (pError || !product) throw new Error('Hizmet bulunamadı');

        let unitPrice = Number(product.price);

        // 2. Handle Piecewise Pricing (Lookup Quantity Steps)
        if (product.pricing_model === 'piecewise') {
            const { data: steps } = await supabase
                .from('service_quantity_steps')
                .select('unit_price')
                .eq('product_id', productId)
                .lte('min_quantity', quantity)
                .order('min_quantity', { ascending: false })
                .limit(1);

            if (steps && steps.length > 0) {
                unitPrice = Number(steps[0].unit_price);
            }
        }

        // 3. Fetch Attributes and Options to apply impacts
        const { data: attributes } = await supabase
            .from('service_attributes')
            .select('id, name, type, options:service_attribute_options(*)')
            .eq('product_id', productId);

        let fixImpacts = 0;
        let globalMultiplier = 1;
        let areaMultiplier = 1;

        if (attributes) {
            for (const attr of attributes) {
                const userValue = config[attr.name];
                if (userValue === undefined || userValue === null) continue;

                const options = attr.options || [];

                if (attr.type === 'select') {
                    const selectedOption = options.find((opt: any) => opt.label === userValue);
                    if (selectedOption) {
                        if (selectedOption.impact_type === 'fixed') {
                            fixImpacts += Number(selectedOption.price_impact);
                        } else if (selectedOption.impact_type === 'percentage') {
                            fixImpacts += (unitPrice * Number(selectedOption.price_impact)) / 100;
                        } else if (selectedOption.impact_type === 'multiplier') {
                            globalMultiplier *= Number(selectedOption.price_impact);
                        }
                    }
                } else if (attr.type === 'number') {
                    const numValue = Number(userValue) || 0;

                    // Special case: Area/Length calculation (Turkish localized)
                    const lowerName = attr.name.toLowerCase();
                    if (lowerName === 'genişlik' || lowerName === 'width') {
                        areaMultiplier *= numValue / 1000;
                    } else if (lowerName === 'yükseklik' || lowerName === 'height') {
                        areaMultiplier *= numValue / 1000;
                    } else {
                        // General number rules via first option (if any)
                        const rule = options[0];
                        if (rule) {
                            if (rule.impact_type === 'per_unit' || rule.impact_type === 'fixed') {
                                // For number attributes, 'fixed' is usually meant to be 'per_unit'
                                fixImpacts += numValue * Number(rule.price_impact);
                            } else if (rule.impact_type === 'multiplier') {
                                globalMultiplier *= (numValue * Number(rule.price_impact)) || 1;
                            } else if (rule.impact_type === 'percentage') {
                                fixImpacts += (unitPrice * (numValue * Number(rule.price_impact))) / 100;
                            }
                        }
                    }
                } else if (attr.type === 'boolean' && userValue === true) {
                    const rule = options[0];
                    if (rule) {
                        if (rule.impact_type === 'fixed') {
                            fixImpacts += Number(rule.price_impact);
                        } else if (rule.impact_type === 'percentage') {
                            fixImpacts += (unitPrice * Number(rule.price_impact)) / 100;
                        } else if (rule.impact_type === 'multiplier') {
                            globalMultiplier *= Number(rule.price_impact);
                        }
                    }
                }
            }
        }

        // 4. Calculate Final
        let subtotal = (unitPrice + fixImpacts);

        if (product.pricing_model === 'area_based') {
            subtotal = subtotal * areaMultiplier;
        }

        const finalUnitPrice = (subtotal * globalMultiplier);
        const totalPrice = finalUnitPrice * quantity;

        return {
            unitPrice: Number(finalUnitPrice.toFixed(2)),
            totalPrice: Number(totalPrice.toFixed(2)),
            configSummarized: config
        };
    }
}

export const serviceService = new ServiceService();
