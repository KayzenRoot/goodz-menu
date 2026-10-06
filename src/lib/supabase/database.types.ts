export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "audit_events": {
                  Row: {
                    "action": string,"actor_user_id": string | null,"branch_id": string | null,"correlation_id": string,"created_at": string,"establishment_id": string | null,"id": string,"metadata": NonNullable<Json>,"organization_id": string | null,"outcome": string,"reason_code": string,"source": string,"target_id": string | null,"target_type": string
                  }
                  Insert: {
                    "action": string,"actor_user_id"?: string | null,"branch_id"?: string | null,"correlation_id": string,"created_at"?: string,"establishment_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string | null,"outcome": string,"reason_code": string,"source": string,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_user_id"?: string | null,"branch_id"?: string | null,"correlation_id"?: string,"created_at"?: string,"establishment_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string | null,"outcome"?: string,"reason_code"?: string,"source"?: string,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_events_branch_tenant_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "audit_events_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "audit_events_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"branches": {
                  Row: {
                    "created_at": string,"display_name": string,"establishment_id": string,"id": string,"organization_id": string,"status": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"establishment_id": string,"id"?: string,"organization_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"establishment_id"?: string,"id"?: string,"organization_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "branches_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "branches_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"catalog_command_receipts": {
                  Row: {
                    "action": string,"actor_user_id": string,"audit_event_id": string,"correlation_id": string,"id": string,"idempotency_key": string,"organization_id": string,"recorded_at": string,"resulting_price_revision": number | null,"target_id": string,"target_type": string
                  }
                  Insert: {
                    "action": string,"actor_user_id": string,"audit_event_id": string,"correlation_id": string,"id"?: string,"idempotency_key": string,"organization_id": string,"recorded_at"?: string,"resulting_price_revision"?: number | null,"target_id": string,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_user_id"?: string,"audit_event_id"?: string,"correlation_id"?: string,"id"?: string,"idempotency_key"?: string,"organization_id"?: string,"recorded_at"?: string,"resulting_price_revision"?: number | null,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "catalog_command_receipts_audit_fkey"
      columns: ["audit_event_id"]
isOneToOne: false
      referencedRelation: "audit_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "catalog_command_receipts_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"channel_offer_price_history": {
                  Row: {
                    "audit_event_id": string,"availability": string,"base_price_amount": number,"base_price_currency": string,"channel_offer_id": string,"correlation_id": string,"effective_from": string,"id": string,"organization_id": string,"price_revision": number,"promotional_price_amount": number | null,"recorded_at": string,"recorded_by_user_id": string,"visibility": string
                  }
                  Insert: {
                    "audit_event_id": string,"availability": string,"base_price_amount": number,"base_price_currency": string,"channel_offer_id": string,"correlation_id": string,"effective_from": string,"id"?: string,"organization_id": string,"price_revision": number,"promotional_price_amount"?: number | null,"recorded_at"?: string,"recorded_by_user_id": string,"visibility": string
                  }
                  Update: {
                    "audit_event_id"?: string,"availability"?: string,"base_price_amount"?: number,"base_price_currency"?: string,"channel_offer_id"?: string,"correlation_id"?: string,"effective_from"?: string,"id"?: string,"organization_id"?: string,"price_revision"?: number,"promotional_price_amount"?: number | null,"recorded_at"?: string,"recorded_by_user_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "channel_offer_price_history_audit_fkey"
      columns: ["audit_event_id"]
isOneToOne: false
      referencedRelation: "audit_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "channel_offer_price_history_offer_tenant_fkey"
      columns: ["organization_id","channel_offer_id"]
isOneToOne: false
      referencedRelation: "channel_offer_pricing"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offer_price_history_offer_tenant_fkey"
      columns: ["organization_id","channel_offer_id"]
isOneToOne: false
      referencedRelation: "channel_offers"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"channel_offers": {
                  Row: {
                    "archived_at": string | null,"availability": string,"base_price_amount": number,"base_price_currency": string,"branch_id": string | null,"created_at": string,"description": string | null,"establishment_id": string | null,"id": string,"organization_id": string,"price_revision": number,"product_id": string | null,"product_variant_id": string | null,"promotional_price_amount": number | null,"sales_channel_id": string,"status": string,"title": string | null,"updated_at": string,"visibility": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"availability"?: string,"base_price_amount": number,"base_price_currency": string,"branch_id"?: string | null,"created_at"?: string,"description"?: string | null,"establishment_id"?: string | null,"id"?: string,"organization_id": string,"price_revision"?: number,"product_id"?: string | null,"product_variant_id"?: string | null,"promotional_price_amount"?: number | null,"sales_channel_id": string,"status"?: string,"title"?: string | null,"updated_at"?: string,"visibility"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"availability"?: string,"base_price_amount"?: number,"base_price_currency"?: string,"branch_id"?: string | null,"created_at"?: string,"description"?: string | null,"establishment_id"?: string | null,"id"?: string,"organization_id"?: string,"price_revision"?: number,"product_id"?: string | null,"product_variant_id"?: string | null,"promotional_price_amount"?: number | null,"sales_channel_id"?: string,"status"?: string,"title"?: string | null,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "channel_offers_branch_tenant_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "channel_offers_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "channel_offers_product_tenant_fkey"
      columns: ["organization_id","product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_product_variant_tenant_fkey"
      columns: ["organization_id","product_variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_sales_channel_tenant_fkey"
      columns: ["organization_id","sales_channel_id"]
isOneToOne: false
      referencedRelation: "sales_channels"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"establishments": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"organization_id": string,"status": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"id"?: string,"organization_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"organization_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "establishments_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"membership_roles": {
                  Row: {
                    "branch_id": string | null,"created_at": string,"establishment_id": string | null,"id": string,"membership_id": string,"organization_id": string,"role_id": string,"scope_type": string
                  }
                  Insert: {
                    "branch_id"?: string | null,"created_at"?: string,"establishment_id"?: string | null,"id"?: string,"membership_id": string,"organization_id": string,"role_id": string,"scope_type": string
                  }
                  Update: {
                    "branch_id"?: string | null,"created_at"?: string,"establishment_id"?: string | null,"id"?: string,"membership_id"?: string,"organization_id"?: string,"role_id"?: string,"scope_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "membership_roles_branch_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "membership_roles_establishment_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "membership_roles_membership_fkey"
      columns: ["organization_id","membership_id"]
isOneToOne: false
      referencedRelation: "organization_memberships"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "membership_roles_role_fkey"
      columns: ["organization_id","role_id"]
isOneToOne: false
      referencedRelation: "tenant_roles"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"organization_memberships": {
                  Row: {
                    "accepted_at": string,"created_at": string,"default_branch_id": string | null,"default_establishment_id": string | null,"id": string,"organization_id": string,"revoked_at": string | null,"status": string,"user_id": string
                  }
                  Insert: {
                    "accepted_at"?: string,"created_at"?: string,"default_branch_id"?: string | null,"default_establishment_id"?: string | null,"id"?: string,"organization_id": string,"revoked_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "accepted_at"?: string,"created_at"?: string,"default_branch_id"?: string | null,"default_establishment_id"?: string | null,"id"?: string,"organization_id"?: string,"revoked_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_memberships_default_branch_fkey"
      columns: ["organization_id","default_establishment_id","default_branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "organization_memberships_default_establishment_fkey"
      columns: ["organization_id","default_establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "organization_memberships_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"legal_name": string | null,"status": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"id"?: string,"legal_name"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"legal_name"?: string | null,"status"?: string
                  }
                  Relationships: [

                  ]
                },"permissions": {
                  Row: {
                    "created_at": string,"display_name": string,"permission_key": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"permission_key": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"permission_key"?: string
                  }
                  Relationships: [

                  ]
                },"product_categories": {
                  Row: {
                    "archived_at": string | null,"branch_id": string | null,"created_at": string,"description": string | null,"display_order": number,"establishment_id": string | null,"id": string,"name": string,"organization_id": string,"parent_category_id": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"branch_id"?: string | null,"created_at"?: string,"description"?: string | null,"display_order"?: number,"establishment_id"?: string | null,"id"?: string,"name": string,"organization_id": string,"parent_category_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"branch_id"?: string | null,"created_at"?: string,"description"?: string | null,"display_order"?: number,"establishment_id"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"parent_category_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_categories_branch_tenant_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "product_categories_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "product_categories_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_parent_tenant_fkey"
      columns: ["organization_id","parent_category_id"]
isOneToOne: false
      referencedRelation: "product_categories"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "archived_at": string | null,"branch_id": string | null,"created_at": string,"establishment_id": string | null,"id": string,"name": string,"organization_id": string,"product_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"branch_id"?: string | null,"created_at"?: string,"establishment_id"?: string | null,"id"?: string,"name": string,"organization_id": string,"product_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"branch_id"?: string | null,"created_at"?: string,"establishment_id"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"product_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_branch_tenant_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "product_variants_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "product_variants_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_product_tenant_fkey"
      columns: ["organization_id","product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"products": {
                  Row: {
                    "archived_at": string | null,"branch_id": string | null,"category_id": string | null,"created_at": string,"description": string | null,"establishment_id": string | null,"id": string,"name": string,"organization_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"branch_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"description"?: string | null,"establishment_id"?: string | null,"id"?: string,"name": string,"organization_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"branch_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"description"?: string | null,"establishment_id"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_branch_tenant_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "products_category_tenant_fkey"
      columns: ["organization_id","category_id"]
isOneToOne: false
      referencedRelation: "product_categories"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "products_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "products_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"role_permissions": {
                  Row: {
                    "created_at": string,"organization_id": string,"permission_key": string,"role_id": string
                  }
                  Insert: {
                    "created_at"?: string,"organization_id": string,"permission_key": string,"role_id": string
                  }
                  Update: {
                    "created_at"?: string,"organization_id"?: string,"permission_key"?: string,"role_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_key_fkey"
      columns: ["permission_key"]
isOneToOne: false
      referencedRelation: "permissions"
      referencedColumns: ["permission_key"]
    },{
      foreignKeyName: "role_permissions_role_fkey"
      columns: ["organization_id","role_id"]
isOneToOne: false
      referencedRelation: "tenant_roles"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"sales_channels": {
                  Row: {
                    "archived_at": string | null,"channel_key": string,"created_at": string,"description": string | null,"display_name": string,"id": string,"organization_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"channel_key": string,"created_at"?: string,"description"?: string | null,"display_name": string,"id"?: string,"organization_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"channel_key"?: string,"created_at"?: string,"description"?: string | null,"display_name"?: string,"id"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_channels_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"tenant_roles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"organization_id": string,"role_key": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"id"?: string,"organization_id": string,"role_key": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"organization_id"?: string,"role_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenant_roles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "channel_offer_price_timeline": {
                  Row: {
                    "audit_event_id": string | null,"availability": string | null,"base_price_amount": string | null,"base_price_currency": string | null,"channel_offer_id": string | null,"correlation_id": string | null,"effective_from": string | null,"effective_to": string | null,"id": string | null,"organization_id": string | null,"price_revision": number | null,"promotional_price_amount": string | null,"recorded_at": string | null,"recorded_by_user_id": string | null,"visibility": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "channel_offer_price_history_audit_fkey"
      columns: ["audit_event_id"]
isOneToOne: false
      referencedRelation: "audit_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "channel_offer_price_history_offer_tenant_fkey"
      columns: ["organization_id","channel_offer_id"]
isOneToOne: false
      referencedRelation: "channel_offer_pricing"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offer_price_history_offer_tenant_fkey"
      columns: ["organization_id","channel_offer_id"]
isOneToOne: false
      referencedRelation: "channel_offers"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"channel_offer_pricing": {
                  Row: {
                    "availability": string | null,"base_price_amount": string | null,"base_price_currency": string | null,"branch_id": string | null,"description": string | null,"establishment_id": string | null,"id": string | null,"organization_id": string | null,"price_revision": number | null,"product_id": string | null,"product_variant_id": string | null,"promotional_price_amount": string | null,"sales_channel_id": string | null,"status": string | null,"title": string | null,"updated_at": string | null,"visibility": string | null
                  }
                  Insert: {
                           "availability"?: string | null,"base_price_amount"?: never,"base_price_currency"?: string | null,"branch_id"?: string | null,"description"?: string | null,"establishment_id"?: string | null,"id"?: string | null,"organization_id"?: string | null,"price_revision"?: number | null,"product_id"?: string | null,"product_variant_id"?: string | null,"promotional_price_amount"?: never,"sales_channel_id"?: string | null,"status"?: string | null,"title"?: string | null,"updated_at"?: string | null,"visibility"?: string | null
                         }
                        Update: {
                           "availability"?: string | null,"base_price_amount"?: never,"base_price_currency"?: string | null,"branch_id"?: string | null,"description"?: string | null,"establishment_id"?: string | null,"id"?: string | null,"organization_id"?: string | null,"price_revision"?: number | null,"product_id"?: string | null,"product_variant_id"?: string | null,"promotional_price_amount"?: never,"sales_channel_id"?: string | null,"status"?: string | null,"title"?: string | null,"updated_at"?: string | null,"visibility"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "channel_offers_branch_tenant_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "channel_offers_establishment_tenant_fkey"
      columns: ["organization_id","establishment_id"]
isOneToOne: false
      referencedRelation: "establishments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "channel_offers_product_tenant_fkey"
      columns: ["organization_id","product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_product_variant_tenant_fkey"
      columns: ["organization_id","product_variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_sales_channel_tenant_fkey"
      columns: ["organization_id","sales_channel_id"]
isOneToOne: false
      referencedRelation: "sales_channels"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                }
          }
          Functions: {
            "append_audit_event":
{ Args: { "p_action": string,"p_actor_user_id"?: string,"p_branch_id"?: string,"p_correlation_id": string,"p_establishment_id"?: string,"p_metadata": Json,"p_organization_id"?: string,"p_outcome": string,"p_reason_code": string,"p_source": string,"p_target_id"?: string,"p_target_type": string }; Returns: string
                           },
"catalog_admitted_scopes":
{ Args: { "p_permission_key": string }; Returns: {
              "branch_id": string,"establishment_id": string,"organization_id": string,"organization_name": string
            }[]
                           },
"catalog_create_category":
{ Args: { "p_branch_id": string,"p_correlation_id": string,"p_description": string,"p_display_order": number,"p_establishment_id": string,"p_idempotency_key": string,"p_name": string,"p_organization_id": string,"p_parent_category_id": string }; Returns: Json
                           },
"catalog_create_channel_offer":
{ Args: { "p_base_price_amount": number,"p_base_price_currency": string,"p_branch_id": string,"p_correlation_id": string,"p_description": string,"p_establishment_id": string,"p_idempotency_key": string,"p_organization_id": string,"p_product_id": string,"p_product_variant_id": string,"p_promotional_price_amount": number,"p_sales_channel_id": string,"p_title": string }; Returns: Json
                           },
"catalog_create_product":
{ Args: { "p_branch_id": string,"p_category_id": string,"p_correlation_id": string,"p_description": string,"p_establishment_id": string,"p_idempotency_key": string,"p_name": string,"p_organization_id": string }; Returns: Json
                           },
"catalog_create_sales_channel":
{ Args: { "p_channel_key": string,"p_correlation_id": string,"p_description": string,"p_display_name": string,"p_idempotency_key": string,"p_organization_id": string }; Returns: Json
                           },
"catalog_create_variant":
{ Args: { "p_branch_id": string,"p_correlation_id": string,"p_establishment_id": string,"p_idempotency_key": string,"p_name": string,"p_organization_id": string,"p_product_id": string }; Returns: Json
                           },
"catalog_set_category_archived":
{ Args: { "p_archived": boolean,"p_category_id": string,"p_correlation_id": string,"p_idempotency_key": string }; Returns: Json
                           },
"catalog_set_product_archived":
{ Args: { "p_archived": boolean,"p_correlation_id": string,"p_idempotency_key": string,"p_product_id": string }; Returns: Json
                           },
"catalog_update_category":
{ Args: { "p_category_id": string,"p_correlation_id": string,"p_description": string,"p_display_order": number,"p_idempotency_key": string,"p_name": string }; Returns: Json
                           },
"catalog_update_channel_offer_availability":
{ Args: { "p_availability": string,"p_correlation_id": string,"p_idempotency_key": string,"p_offer_id": string }; Returns: Json
                           },
"catalog_update_channel_offer_presentation":
{ Args: { "p_correlation_id": string,"p_description": string,"p_idempotency_key": string,"p_offer_id": string,"p_title": string }; Returns: Json
                           },
"catalog_update_channel_offer_price":
{ Args: { "p_base_price_amount": number,"p_correlation_id": string,"p_idempotency_key": string,"p_offer_id": string,"p_promotional_price_amount": number }; Returns: Json
                           },
"catalog_update_channel_offer_visibility":
{ Args: { "p_correlation_id": string,"p_idempotency_key": string,"p_offer_id": string,"p_visibility": string }; Returns: Json
                           },
"catalog_update_product":
{ Args: { "p_correlation_id": string,"p_description": string,"p_idempotency_key": string,"p_name": string,"p_product_id": string }; Returns: Json
                           },
"catalog_update_sales_channel":
{ Args: { "p_channel_id": string,"p_correlation_id": string,"p_description": string,"p_display_name": string,"p_idempotency_key": string }; Returns: Json
                           },
"catalog_update_variant":
{ Args: { "p_archived": boolean,"p_correlation_id": string,"p_idempotency_key": string,"p_name": string,"p_variant_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const
