CREATE TABLE "auth_peer_sessions" (
	"user_sub" text PRIMARY KEY NOT NULL,
	"last_web_login_at" timestamp with time zone,
	"last_app_login_at" timestamp with time zone
);
