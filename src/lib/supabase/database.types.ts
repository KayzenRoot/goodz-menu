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
                },"channel_offer_price_history": {
                  Row: {
                    "actor_user_id": string,"amount": number,"channel_offer_id": string,"correlation_id": string,"created_at": string,"currency": string,"id": string,"organization_id": string,"version": number
                  }
                  Insert: {
                    "actor_user_id": string,"amount": number,"channel_offer_id": string,"correlation_id": string,"created_at"?: string,"currency"?: string,"id"?: string,"organization_id": string,"version": number
                  }
                  Update: {
                    "actor_user_id"?: string,"amount"?: number,"channel_offer_id"?: string,"correlation_id"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"organization_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "channel_offer_price_history_offer_tenant_fkey"
      columns: ["organization_id","channel_offer_id"]
isOneToOne: false
      referencedRelation: "channel_offers"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"channel_offers": {
                  Row: {
                    "availability_state": string,"base_price": number | null,"branch_id": string | null,"created_at": string,"currency": string,"description_override": string | null,"establishment_id": string | null,"id": string,"is_visible": boolean,"organization_id": string,"product_id": string | null,"sales_channel_id": string,"status": string,"target_kind": string,"title_override": string | null,"updated_at": string,"variant_id": string | null
                  }
                  Insert: {
                    "availability_state"?: string,"base_price"?: number | null,"branch_id"?: string | null,"created_at"?: string,"currency"?: string,"description_override"?: string | null,"establishment_id"?: string | null,"id"?: string,"is_visible"?: boolean,"organization_id": string,"product_id"?: string | null,"sales_channel_id": string,"status"?: string,"target_kind": string,"title_override"?: string | null,"updated_at"?: string,"variant_id"?: string | null
                  }
                  Update: {
                    "availability_state"?: string,"base_price"?: number | null,"branch_id"?: string | null,"created_at"?: string,"currency"?: string,"description_override"?: string | null,"establishment_id"?: string | null,"id"?: string,"is_visible"?: boolean,"organization_id"?: string,"product_id"?: string | null,"sales_channel_id"?: string,"status"?: string,"target_kind"?: string,"title_override"?: string | null,"updated_at"?: string,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "channel_offers_branch_scope_fkey"
      columns: ["organization_id","establishment_id","branch_id"]
isOneToOne: false
      referencedRelation: "branches"
      referencedColumns: ["organization_id","establishment_id","id"]
    },{
      foreignKeyName: "channel_offers_channel_tenant_fkey"
      columns: ["organization_id","sales_channel_id"]
isOneToOne: false
      referencedRelation: "sales_channels"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "channel_offers_establishment_scope_fkey"
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
      foreignKeyName: "channel_offers_variant_tenant_fkey"
      columns: ["organization_id","variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
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
                    "created_at": string,"description": string,"id": string,"name": string,"organization_id": string,"parent_id": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name": string,"organization_id": string,"parent_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"organization_id"?: string,"parent_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_categories_organization_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_parent_tenant_fkey"
      columns: ["organization_id","parent_id"]
isOneToOne: false
      referencedRelation: "product_categories"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "created_at": string,"flavor_label": string | null,"id": string,"name": string,"organization_id": string,"product_id": string,"size_label": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"flavor_label"?: string | null,"id"?: string,"name": string,"organization_id": string,"product_id": string,"size_label"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"flavor_label"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"product_id"?: string,"size_label"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
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
                    "category_id": string | null,"created_at": string,"description": string,"id": string,"name": string,"organization_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"name": string,"organization_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_tenant_fkey"
      columns: ["organization_id","category_id"]
isOneToOne: false
      referencedRelation: "product_categories"
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
                    "channel_key": string,"created_at": string,"display_name": string,"id": string,"organization_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "channel_key": string,"created_at"?: string,"display_name": string,"id"?: string,"organization_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "channel_key"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string
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
            [_ in never]: never
          }
          Functions: {
            "append_audit_event":
{ Args: { "p_action": string,"p_actor_user_id"?: string,"p_branch_id"?: string,"p_correlation_id": string,"p_establishment_id"?: string,"p_metadata": Json,"p_organization_id"?: string,"p_outcome": string,"p_reason_code": string,"p_source": string,"p_target_id"?: string,"p_target_type": string }; Returns: string
                           },
"append_catalog_step_up_event":
{ Args: { "p_actor_user_id": string,"p_branch_id": string,"p_correlation_id": string,"p_establishment_id": string,"p_organization_id": string,"p_outcome": string,"p_reason_code": string,"p_required_permissions": (string)[],"p_target_id": string }; Returns: string
                           },
"catalog_has_permission":
{ Args: { "p_branch_id": string,"p_establishment_id": string,"p_organization_id": string,"p_permission_key": string }; Returns: boolean
                           },
"catalog_save_category":
{ Args: { "p_correlation_id": string,"p_description": string,"p_id": string,"p_name": string,"p_organization_id": string,"p_parent_id": string,"p_status": string }; Returns: string
                           },
"catalog_save_channel":
{ Args: { "p_channel_key": string,"p_correlation_id": string,"p_display_name": string,"p_id": string,"p_organization_id": string,"p_status": string }; Returns: string
                           },
"catalog_save_offer":
{ Args: { "p_availability_state": string,"p_base_price": number,"p_branch_id": string,"p_correlation_id": string,"p_currency": string,"p_description_override": string,"p_establishment_id": string,"p_id": string,"p_is_visible": boolean,"p_organization_id": string,"p_product_id": string,"p_sales_channel_id": string,"p_status": string,"p_step_up_proof_id": string,"p_target_kind": string,"p_title_override": string,"p_variant_id": string }; Returns: string
                           },
"catalog_save_product":
{ Args: { "p_category_id": string,"p_correlation_id": string,"p_description": string,"p_id": string,"p_name": string,"p_organization_id": string,"p_status": string }; Returns: string
                           },
"catalog_save_variant":
{ Args: { "p_correlation_id": string,"p_flavor_label": string,"p_id": string,"p_name": string,"p_organization_id": string,"p_product_id": string,"p_size_label": string,"p_status": string }; Returns: string
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
