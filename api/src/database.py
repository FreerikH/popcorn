from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
import os
from dotenv import load_dotenv

load_dotenv()

class DB:
    def __init__(self):
        self.engine = create_engine(os.getenv('DB_CONNECTION_STRING'))

    def execute(self, sql, params = {}, fetch = True):
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text(sql), params or {})
                connection.commit()
                if fetch or True:
                    cursor = result.cursor
                    try:
                        columns = [c.name for c in cursor.description]
                        records = result.fetchall()
                        return [{k:v for k,v in zip(columns, r)} for r in records]
                    except:
                        return None
        except OperationalError as e:
            pass
        except Exception as e:
            raise