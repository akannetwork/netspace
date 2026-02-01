-- RPC to increment contact balance atomically
CREATE OR REPLACE FUNCTION increment_contact_balance(p_contact_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE contacts
    SET balance = COALESCE(balance, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_contact_id;
END;
$$;
