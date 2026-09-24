import datetime
from uuid import UUID
from json import JSONEncoder


class RedisEncoder(JSONEncoder):
    # Override the default method
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()

        if isinstance(obj, UUID):
            return str(obj)

        return super().default(obj)