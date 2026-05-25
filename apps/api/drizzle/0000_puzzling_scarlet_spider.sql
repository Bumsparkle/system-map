CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "diagrams" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" text PRIMARY KEY NOT NULL,
	"diagram_id" text NOT NULL,
	"source_node_id" text NOT NULL,
	"target_node_id" text NOT NULL,
	"source_handle" text,
	"target_handle" text,
	"flow_type" text NOT NULL,
	"label" text,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "layers" (
	"id" text PRIMARY KEY NOT NULL,
	"diagram_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"order" integer NOT NULL,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"diagram_id" text NOT NULL,
	"layer_id" text NOT NULL,
	"type" text NOT NULL,
	"position_x" real NOT NULL,
	"position_y" real NOT NULL,
	"width" real,
	"height" real,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "views" (
	"id" text PRIMARY KEY NOT NULL,
	"diagram_id" text NOT NULL,
	"name" text NOT NULL,
	"filter" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagrams" ADD CONSTRAINT "diagrams_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_diagram_id_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_node_id_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_node_id_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layers" ADD CONSTRAINT "layers_diagram_id_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_diagram_id_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_layer_id_layers_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."layers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "views" ADD CONSTRAINT "views_diagram_id_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagrams"("id") ON DELETE cascade ON UPDATE no action;