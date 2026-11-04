CREATE TABLE support_conversations (
 id TEXT PRIMARY KEY,
 customer_id TEXT NOT NULL REFERENCES customer_users(id),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed'))
);
CREATE INDEX support_customer_updated ON support_conversations(customer_id,updated_at DESC);
CREATE INDEX support_admin_updated ON support_conversations(status,updated_at DESC);
CREATE TABLE support_messages (
 id TEXT PRIMARY KEY,
 conversation_id TEXT NOT NULL REFERENCES support_conversations(id),
 sender TEXT NOT NULL CHECK(sender IN ('customer','admin')),
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX support_messages_conversation ON support_messages(conversation_id,created_at,id);
