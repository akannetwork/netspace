-- Backfill contact_id in orders table by matching email with contacts table

UPDATE orders
SET contact_id = contacts.id
FROM contacts
WHERE orders.customer_email = contacts.email
  AND orders.contact_id IS NULL;
