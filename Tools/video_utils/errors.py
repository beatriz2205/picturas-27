"""Exceções com o reason.code do contrato (worker-messages.md)."""


class TaskError(Exception):
    """Falha da tarefa com um reason.code do contrato."""

    def __init__(self, code, message=""):
        super().__init__(message or code)
        self.code = code


class Cancelled(Exception):
    """A tarefa foi cancelada (exchange video_cancel): não se publica nenhum evento."""


class Timeout(TaskError):
    def __init__(self, message="Tempo máximo de processamento excedido"):
        super().__init__("timeout", message)
