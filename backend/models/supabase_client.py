import os
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class SupabaseService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.url = os.getenv("SUPABASE_URL", "").strip()
        self.key = os.getenv("SUPABASE_KEY", "").strip()
        self.client = None
        self.is_connected = False

        if self.url and self.key and not self.url.startswith("https://your-project"):
            try:
                from supabase import create_client, Client
                self.client: Client = create_client(self.url, self.key)
                self.is_connected = True
                print(f"[SUPABASE] Conectado exitosamente a instancia en: {self.url}")
            except Exception as e:
                print(f"[SUPABASE] Error inicializando cliente Supabase: {e}")
                self.is_connected = False
        else:
            print("[SUPABASE] Variables SUPABASE_URL y SUPABASE_KEY no configuradas en .env.")
            print("[SUPABASE] Ejecutando con persistencia local sincronizable.")

    def fetch_all(self, table: str) -> Optional[List[Dict[str, Any]]]:
        if not self.is_connected or not self.client:
            return None
        try:
            response = self.client.table(table).select("*").execute()
            return response.data
        except Exception as e:
            print(f"[SUPABASE] Error consultando tabla '{table}': {e}")
            return None

    def upsert(self, table: str, record: Dict[str, Any]) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            self.client.table(table).upsert(record).execute()
            return True
        except Exception as e:
            print(f"[SUPABASE] Error en upsert sobre tabla '{table}': {e}")
            return False

    def insert_batch(self, table: str, records: List[Dict[str, Any]]) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            self.client.table(table).upsert(records).execute()
            return True
        except Exception as e:
            print(f"[SUPABASE] Error en insert_batch sobre tabla '{table}': {e}")
            return False

    def delete(self, table: str, record_id: str) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            self.client.table(table).delete().eq("id", record_id).execute()
            return True
        except Exception as e:
            print(f"[SUPABASE] Error en delete sobre tabla '{table}': {e}")
            return False
