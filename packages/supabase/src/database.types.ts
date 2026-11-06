
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activities": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"deleted_at": string | null,"entity_id": string,"entity_type": string,"id": string,"kind": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"deleted_at"?: string | null,"entity_id": string,"entity_type": string,"id"?: string,"kind": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"deleted_at"?: string | null,"entity_id"?: string,"entity_type"?: string,"id"?: string,"kind"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_errors": {
                  Row: {
                    "app_version": string,"context": string,"created_at": string,"fatal": boolean,"id": string,"message": string,"occurred_at": string,"platform": string,"stack": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "app_version"?: string,"context"?: string,"created_at"?: string,"fatal"?: boolean,"id"?: string,"message": string,"occurred_at": string,"platform"?: string,"stack"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "app_version"?: string,"context"?: string,"created_at"?: string,"fatal"?: boolean,"id"?: string,"message"?: string,"occurred_at"?: string,"platform"?: string,"stack"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"bookings": {
                  Row: {
                    "cancelled_at": string | null,"created_at": string,"currency": string,"date": string,"deleted_at": string | null,"id": string,"people": number,"reminded_at": string | null,"slot_id": string,"status": string,"total": number,"tour_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_at"?: string | null,"created_at"?: string,"currency": string,"date": string,"deleted_at"?: string | null,"id": string,"people": number,"reminded_at"?: string | null,"slot_id": string,"status"?: string,"total": number,"tour_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"created_at"?: string,"currency"?: string,"date"?: string,"deleted_at"?: string | null,"id"?: string,"people"?: number,"reminded_at"?: string | null,"slot_id"?: string,"status"?: string,"total"?: number,"tour_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "tour_slots"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "booking_url": string | null,"city": string,"created_at": string,"deleted_at": string | null,"description": string,"email": string,"id": string,"name": string,"status": string,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_url"?: string | null,"city": string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"email": string,"id": string,"name": string,"status"?: string,"type": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "booking_url"?: string | null,"city"?: string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string,"email"?: string,"id"?: string,"name"?: string,"status"?: string,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"catalog": {
                  Row: {
                    "data": NonNullable<Json>,"deleted_at": string | null,"id": string,"key": string,"kind": string,"sort": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data": NonNullable<Json>,"deleted_at"?: string | null,"id": string,"key": string,"kind": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "data"?: NonNullable<Json>,"deleted_at"?: string | null,"id"?: string,"key"?: string,"kind"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chat_members": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"last_read_at": string | null,"thread_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"last_read_at"?: string | null,"thread_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"last_read_at"?: string | null,"thread_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chat_members_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "chat_threads"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_threads": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"kind": string,"last_message_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"kind": string,"last_message_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"kind"?: string,"last_message_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"item_ids": NonNullable<Json>,"name": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"item_ids"?: NonNullable<Json>,"name": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"item_ids"?: NonNullable<Json>,"name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"comments": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"post_id": string,"text": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"post_id": string,"text": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"post_id"?: string,"text"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"devices": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"language": string,"last_seen_at": string,"name": string,"platform": string,"push_token": string | null,"revoked_at": string | null,"session_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"language"?: string,"last_seen_at"?: string,"name"?: string,"platform"?: string,"push_token"?: string | null,"revoked_at"?: string | null,"session_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"language"?: string,"last_seen_at"?: string,"name"?: string,"platform"?: string,"push_token"?: string | null,"revoked_at"?: string | null,"session_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"followee_id": string,"id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"followee_id": string,"id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"followee_id"?: string,"id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invite_links": {
                  Row: {
                    "created_at": string,"created_by": string,"entity_id": string,"entity_type": string,"expires_at": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"entity_id": string,"entity_type": string,"expires_at"?: string,"token"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"entity_id"?: string,"entity_type"?: string,"expires_at"?: string,"token"?: string
                  }
                  Relationships: [
                    
                  ]
                },"itineraries": {
                  Row: {
                    "created_at": string,"dates": string,"days": NonNullable<Json>,"deleted_at": string | null,"flag": string,"id": string,"place": string,"source_recommendation_id": string | null,"status": string,"suggestion_key": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dates"?: string,"days"?: NonNullable<Json>,"deleted_at"?: string | null,"flag"?: string,"id": string,"place"?: string,"source_recommendation_id"?: string | null,"status"?: string,"suggestion_key"?: string,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"dates"?: string,"days"?: NonNullable<Json>,"deleted_at"?: string | null,"flag"?: string,"id"?: string,"place"?: string,"source_recommendation_id"?: string | null,"status"?: string,"suggestion_key"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"live_logs": {
                  Row: {
                    "amount": number,"author": string,"created_at": string,"day": number | null,"deleted_at": string | null,"detail": string | null,"id": string,"photo": string | null,"session_id": string,"text": string,"time": string,"type": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"author"?: string,"created_at"?: string,"day"?: number | null,"deleted_at"?: string | null,"detail"?: string | null,"id": string,"photo"?: string | null,"session_id": string,"text": string,"time"?: string,"type": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "amount"?: number,"author"?: string,"created_at"?: string,"day"?: number | null,"deleted_at"?: string | null,"detail"?: string | null,"id"?: string,"photo"?: string | null,"session_id"?: string,"text"?: string,"time"?: string,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "live_logs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "live_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"live_sessions": {
                  Row: {
                    "active": boolean,"created_at": string,"day": number,"deleted_at": string | null,"done": NonNullable<Json>,"id": string,"itinerary_id": string,"spent": number,"started_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"day"?: number,"deleted_at"?: string | null,"done"?: NonNullable<Json>,"id": string,"itinerary_id": string,"spent"?: number,"started_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"day"?: number,"deleted_at"?: string | null,"done"?: NonNullable<Json>,"id"?: string,"itinerary_id"?: string,"spent"?: number,"started_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "live_sessions_itinerary_id_fkey"
      columns: ["itinerary_id"]
isOneToOne: false
      referencedRelation: "itineraries"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"entity_id": string,"entity_type": string,"id": string,"invited_by": string | null,"role": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"entity_id": string,"entity_type": string,"id": string,"invited_by"?: string | null,"role"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"entity_id"?: string,"entity_type"?: string,"id"?: string,"invited_by"?: string | null,"role"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"text": string,"thread_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"text": string,"thread_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"text"?: string,"thread_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_thread_id_fkey"
      columns: ["thread_id"]
isOneToOne: false
      referencedRelation: "chat_threads"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"data": NonNullable<Json>,"deleted_at": string | null,"entity_id": string | null,"entity_type": string | null,"id": string,"read_at": string | null,"type": string,"updated_at": string,"user_id": string,"push_pref": string | null
                  }
                  ComputedFields: "push_pref"
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"deleted_at"?: string | null,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"read_at"?: string | null,"type": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"deleted_at"?: string | null,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"read_at"?: string | null,"type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"people": {
                  Row: {
                    "avatar_url": string | null,"bio": string,"city": string,"created_at": string,"deleted_at": string | null,"expert_area": string | null,"expert_role": string | null,"id": string,"name": string,"searchable": boolean,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string,"city"?: string,"created_at"?: string,"deleted_at"?: string | null,"expert_area"?: string | null,"expert_role"?: string | null,"id": string,"name"?: string,"searchable"?: boolean,"updated_at"?: string,"username"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string,"city"?: string,"created_at"?: string,"deleted_at"?: string | null,"expert_area"?: string | null,"expert_role"?: string | null,"id"?: string,"name"?: string,"searchable"?: boolean,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"photos": {
                  Row: {
                    "caption": string | null,"created_at": string,"deleted_at": string | null,"height": number | null,"id": string,"lat": number | null,"lng": number | null,"storage_path": string,"taken_at": string | null,"trip_id": string | null,"updated_at": string,"uploaded": boolean,"user_id": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"height"?: number | null,"id": string,"lat"?: number | null,"lng"?: number | null,"storage_path": string,"taken_at"?: string | null,"trip_id"?: string | null,"updated_at"?: string,"uploaded"?: boolean,"user_id"?: string,"width"?: number | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"height"?: number | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"storage_path"?: string,"taken_at"?: string | null,"trip_id"?: string | null,"updated_at"?: string,"uploaded"?: boolean,"user_id"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_trip_id_fkey"
      columns: ["trip_id"]
isOneToOne: false
      referencedRelation: "trips"
      referencedColumns: ["id"]
    }
                  ]
                },"post_votes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id"?: string,"value": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string,"value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_votes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"photo_paths": NonNullable<Json>,"place_label": string,"place_ref": Json | null,"rating": number | null,"text": string,"title": string | null,"trip_id": string | null,"type": string,"updated_at": string,"user_id": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"photo_paths"?: NonNullable<Json>,"place_label"?: string,"place_ref"?: Json | null,"rating"?: number | null,"text": string,"title"?: string | null,"trip_id"?: string | null,"type": string,"updated_at"?: string,"user_id"?: string,"visibility"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"photo_paths"?: NonNullable<Json>,"place_label"?: string,"place_ref"?: Json | null,"rating"?: number | null,"text"?: string,"title"?: string | null,"trip_id"?: string | null,"type"?: string,"updated_at"?: string,"user_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_trip_id_fkey"
      columns: ["trip_id"]
isOneToOne: false
      referencedRelation: "trips"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "auto_organize_photos": boolean,"avatar_url": string | null,"bio": string,"city": string,"created_at": string,"currency": string,"deleted_at": string | null,"id": string,"name": string,"notification_prefs": NonNullable<Json>,"onboarded_at": string | null,"privacy": string,"privacy_detail": NonNullable<Json>,"units": string,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_organize_photos"?: boolean,"avatar_url"?: string | null,"bio"?: string,"city"?: string,"created_at"?: string,"currency"?: string,"deleted_at"?: string | null,"id"?: string,"name"?: string,"notification_prefs"?: NonNullable<Json>,"onboarded_at"?: string | null,"privacy"?: string,"privacy_detail"?: NonNullable<Json>,"units"?: string,"updated_at"?: string,"username"?: string
                  }
                  Update: {
                    "auto_organize_photos"?: boolean,"avatar_url"?: string | null,"bio"?: string,"city"?: string,"created_at"?: string,"currency"?: string,"deleted_at"?: string | null,"id"?: string,"name"?: string,"notification_prefs"?: NonNullable<Json>,"onboarded_at"?: string | null,"privacy"?: string,"privacy_detail"?: NonNullable<Json>,"units"?: string,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_log": {
                  Row: {
                    "created_at": string,"request_id": number,"tokens": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"request_id": number,"tokens": (string)[]
                  }
                  Update: {
                    "created_at"?: string,"request_id"?: number,"tokens"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"push_templates": {
                  Row: {
                    "key": string,"lang": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"lang": string,"text": string
                  }
                  Update: {
                    "key"?: string,"lang"?: string,"text"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saved_items": {
                  Row: {
                    "category": string,"city": string,"created_at": string,"deleted_at": string | null,"flag": string,"id": string,"meta": string,"name": string,"rating": string,"ref_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"city"?: string,"created_at"?: string,"deleted_at"?: string | null,"flag"?: string,"id": string,"meta"?: string,"name"?: string,"rating"?: string,"ref_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "category"?: string,"city"?: string,"created_at"?: string,"deleted_at"?: string | null,"flag"?: string,"id"?: string,"meta"?: string,"name"?: string,"rating"?: string,"ref_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tour_schedules": {
                  Row: {
                    "active": boolean,"capacity": number,"days_ahead": number,"tour_id": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"capacity"?: number,"days_ahead"?: number,"tour_id": string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "active"?: boolean,"capacity"?: number,"days_ahead"?: number,"tour_id"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    
                  ]
                },"tour_slots": {
                  Row: {
                    "booked": number,"capacity": number,"created_at": string,"date": string,"deleted_at": string | null,"id": string,"tour_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booked"?: number,"capacity": number,"created_at"?: string,"date": string,"deleted_at"?: string | null,"id"?: string,"tour_id": string,"updated_at"?: string
                  }
                  Update: {
                    "booked"?: number,"capacity"?: number,"created_at"?: string,"date"?: string,"deleted_at"?: string | null,"id"?: string,"tour_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trip_expenses": {
                  Row: {
                    "amount": number,"amount_label": string,"category": string,"created_at": string,"deleted_at": string | null,"icon": string,"id": string,"meta": string,"name": string,"paid_by": string | null,"receipt": boolean,"split": NonNullable<Json>,"trip_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"amount_label"?: string,"category"?: string,"created_at"?: string,"deleted_at"?: string | null,"icon"?: string,"id": string,"meta"?: string,"name": string,"paid_by"?: string | null,"receipt"?: boolean,"split"?: NonNullable<Json>,"trip_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "amount"?: number,"amount_label"?: string,"category"?: string,"created_at"?: string,"deleted_at"?: string | null,"icon"?: string,"id"?: string,"meta"?: string,"name"?: string,"paid_by"?: string | null,"receipt"?: boolean,"split"?: NonNullable<Json>,"trip_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trip_expenses_trip_id_fkey"
      columns: ["trip_id"]
isOneToOne: false
      referencedRelation: "trips"
      referencedColumns: ["id"]
    }
                  ]
                },"trips": {
                  Row: {
                    "companions": NonNullable<Json>,"country": string,"country_iso": string | null,"created_at": string,"days": number,"deleted_at": string | null,"details": Json | null,"flag": string,"id": string,"people": string,"period": string,"photos": number,"place": string,"places": number,"tint": string,"title": string,"total": string,"updated_at": string,"user_id": string,"year": string
                  }
                  ComputedFields: never
                  Insert: {
                    "companions"?: NonNullable<Json>,"country"?: string,"country_iso"?: string | null,"created_at"?: string,"days"?: number,"deleted_at"?: string | null,"details"?: Json | null,"flag"?: string,"id": string,"people"?: string,"period"?: string,"photos"?: number,"place"?: string,"places"?: number,"tint"?: string,"title": string,"total"?: string,"updated_at"?: string,"user_id"?: string,"year"?: string
                  }
                  Update: {
                    "companions"?: NonNullable<Json>,"country"?: string,"country_iso"?: string | null,"created_at"?: string,"days"?: number,"deleted_at"?: string | null,"details"?: Json | null,"flag"?: string,"id"?: string,"people"?: string,"period"?: string,"photos"?: number,"place"?: string,"places"?: number,"tint"?: string,"title"?: string,"total"?: string,"updated_at"?: string,"user_id"?: string,"year"?: string
                  }
                  Relationships: [
                    
                  ]
                },"visited_countries": {
                  Row: {
                    "country_iso": string,"created_at": string,"deleted_at": string | null,"id": string,"updated_at": string,"user_id": string,"years": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "country_iso": string,"created_at"?: string,"deleted_at"?: string | null,"id": string,"updated_at"?: string,"user_id"?: string,"years"?: NonNullable<Json>
                  }
                  Update: {
                    "country_iso"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"updated_at"?: string,"user_id"?: string,"years"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"wish_destinations": {
                  Row: {
                    "companions": NonNullable<Json>,"country_iso": string | null,"cover_url": string | null,"created_at": string,"deleted_at": string | null,"flag": string,"id": string,"name": string,"note": string,"tint": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "companions"?: NonNullable<Json>,"country_iso"?: string | null,"cover_url"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"flag"?: string,"id": string,"name": string,"note"?: string,"tint"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "companions"?: NonNullable<Json>,"country_iso"?: string | null,"cover_url"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"flag"?: string,"id"?: string,"name"?: string,"note"?: string,"tint"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aal_ok":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"accept_invite_link":
{ Args: { "p_token": string }; Returns: {
              "entity_id": string,"entity_type": string
            }[]
                           },
"book_tour":
{ Args: { "p_id": string,"p_people": number,"p_slot": string }; Returns: {
              "cancelled_at": string | null,
"created_at": string,
"currency": string,
"date": string,
"deleted_at": string | null,
"id": string,
"people": number,
"reminded_at": string | null,
"slot_id": string,
"status": string,
"total": number,
"tour_id": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"booking_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"can_edit":
{ Args: { "p_id": string,"p_type": string }; Returns: boolean
                           },
"can_view":
{ Args: { "p_id": string,"p_type": string }; Returns: boolean
                           },
"cancel_booking":
{ Args: { "p_id": string }; Returns: {
              "cancelled_at": string | null,
"created_at": string,
"currency": string,
"date": string,
"deleted_at": string | null,
"id": string,
"people": number,
"reminded_at": string | null,
"slot_id": string,
"status": string,
"total": number,
"tour_id": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"community_feed":
{ Args: { "p_author"?: string,"p_before"?: string,"p_limit"?: number,"p_place"?: string,"p_segment"?: string }; Returns: {
              "author_avatar": string,"author_expert_role": string,"author_id": string,"author_name": string,"author_username": string,"comments": number,"created_at": string,"id": string,"my_vote": string,"no": number,"photo_paths": Json,"place_label": string,"place_ref": Json,"rating": number,"text": string,"title": string,"trip_id": string,"type": string,"visibility": string,"yes": number
            }[]
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"entity_people":
{ Args: { "p_id": string,"p_type": string }; Returns: string[]
                           },
"expense_editable":
{ Args: { "p_id": string }; Returns: boolean
                           },
"in_thread":
{ Args: { "p_thread": string }; Returns: boolean
                           },
"is_member":
{ Args: { "p_id": string,"p_statuses": (string)[],"p_type": string }; Returns: boolean
                           },
"membership_updatable":
{ Args: { "p_id": string }; Returns: boolean
                           },
"notify":
{ Args: { "p_actor": string,"p_data": Json,"p_entity_id": string,"p_entity_type": string,"p_recipient": string,"p_type": string }; Returns: undefined
                           },
"open_direct_thread":
{ Args: { "p_other": string }; Returns: string
                           },
"open_support_thread":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"open_tour_slots":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"owner_of":
{ Args: { "p_id": string,"p_type": string }; Returns: string
                           },
"post_comments":
{ Args: { "p_post": string }; Returns: {
              "author_avatar": string,"author_id": string,"author_name": string,"author_username": string,"created_at": string,"id": string,"text": string
            }[]
                           },
"post_visible":
{ Args: { "p_author": string,"p_deleted": string,"p_visibility": string }; Returns: boolean
                           },
"push_body":
{ Args: { "n": Omit<Database["public"]['Tables']["notifications"]['Row'], Database["public"]['Tables']["notifications"]['ComputedFields']>,"p_lang": string }; Returns: string
                           },
"push_cleanup":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"push_pref":
{ Args: { "n": Omit<Database["public"]['Tables']["notifications"]['Row'], Database["public"]['Tables']["notifications"]['ComputedFields']> }; Returns: string
                           },
"related":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"revoke_device":
{ Args: { "p_device": string }; Returns: undefined
                           },
"search_people":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "avatar_url": string | null,
"bio": string,
"city": string,
"created_at": string,
"deleted_at": string | null,
"expert_area": string | null,
"expert_role": string | null,
"id": string,
"name": string,
"searchable": boolean,
"updated_at": string,
"username": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "people"
        isOneToOne: false
        isSetofReturn: true
      } },
"touch_entity":
{ Args: { "p_id": string,"p_type": string }; Returns: undefined
                           },
"touch_people":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"traveler_profile":
{ Args: { "p_user": string }; Returns: Json
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
