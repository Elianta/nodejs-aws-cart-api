-- 1. Add pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create cart_status enum
CREATE TYPE cart_status AS ENUM ('OPEN', 'ORDERED');

-- 3. Create carts table
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status cart_status NOT NULL DEFAULT 'OPEN'
);

-- 4. Create cart_items table
CREATE TABLE cart_items (
  cart_id UUID NOT NULL,
  product_id UUID NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE
);

-- 5. Test data for carts
INSERT INTO carts (id, user_id, status) VALUES
  ('b06838c0-e30f-4d17-8c0e-4cd6e3782c27', '8e05a965-51e9-48c7-b6fe-5b9f4141315c', 'OPEN'),
  ('df6c0279-0bda-4f72-a15e-b46025266f3a', '7d845fe1-fc2f-4600-af4c-d170b591e858', 'ORDERED'),
  ('965187a8-e1e6-4e01-90c6-6b92eb3c159a', 'db6cc173-31b1-4b83-9b8b-f5701be97717', 'OPEN');

-- 6. Test data for cart_items
INSERT INTO cart_items (cart_id, product_id, count) VALUES
  ('b06838c0-e30f-4d17-8c0e-4cd6e3782c27', '83c16afd-dd96-47f9-a2d0-ea95abe21ef9', 1),
  ('b06838c0-e30f-4d17-8c0e-4cd6e3782c27', 'efe2fe93-f5cf-46a0-a357-274f8edac319', 3),
  ('df6c0279-0bda-4f72-a15e-b46025266f3a', 'd0f265f9-7a60-4be4-8e96-eeebfad0d415', 2),
  ('df6c0279-0bda-4f72-a15e-b46025266f3a', 'd30ac3ca-e6b3-4223-8f90-c6095b6a95d8', 5),
  ('965187a8-e1e6-4e01-90c6-6b92eb3c159a', '36dc25ff-d62b-4d7f-ba85-9371fed002b5', 2),
  ('965187a8-e1e6-4e01-90c6-6b92eb3c159a', 'c5d9c6ca-a2b6-4f87-9b30-d3b7c7f6b2f5', 2),
  ('965187a8-e1e6-4e01-90c6-6b92eb3c159a', 'aff8d4e7-3d8d-4385-a9a8-95ec9a76d71d', 5);
