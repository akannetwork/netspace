
-- Replace create_order function to include payment_method
CREATE OR REPLACE FUNCTION create_order(
    p_tenant_id uuid,
    p_order_number text,
    p_customer_name text,
    p_customer_email text,
    p_customer_phone text,
    p_shipping_address text,
    p_total_amount decimal,
    p_channel text,
    p_items jsonb,
    p_branch_id uuid DEFAULT NULL,
    p_payment_method text DEFAULT NULL,
    p_payment_status text DEFAULT 'pending'
) RETURNS jsonb AS $$
DECLARE
    v_order_id uuid;
    v_item jsonb;
    v_order_record record;
BEGIN
    -- 1. Create Order
    INSERT INTO orders (
        tenant_id, 
        order_number, 
        customer_name, 
        customer_email, 
        customer_phone, 
        shipping_address, 
        total_amount, 
        channel,
        branch_id,
        payment_method,
        payment_status
    ) VALUES (
        p_tenant_id, 
        p_order_number, 
        p_customer_name, 
        p_customer_email, 
        p_customer_phone, 
        p_shipping_address, 
        p_total_amount, 
        p_channel,
        p_branch_id,
        p_payment_method,
        p_payment_status
    ) RETURNING id, order_number, total_amount, status INTO v_order_record;

    v_order_id := v_order_record.id;

    -- 2. Create Order Items and Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id, 
            product_id, 
            title, 
            price, 
            quantity
        ) VALUES (
            v_order_id, 
            (v_item->>'product_id')::uuid, 
            v_item->>'title', 
            (v_item->>'price')::decimal, 
            (v_item->>'quantity')::integer
        );
        
        -- Stock Deduction Logic could go here
    END LOOP;

    RETURN to_jsonb(v_order_record);
END;
$$ LANGUAGE plpgsql;
