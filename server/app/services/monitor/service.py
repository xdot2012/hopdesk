from .repository import MonitorRepository


class MonitorService:
    def __init__(self, monitor_repository: MonitorRepository):
        self.monitor_repository = monitor_repository
        self.monitor_repository.log_info('Starting Monitoring Service.')

