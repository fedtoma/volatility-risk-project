import logging

def setup_logging() -> None:
    logging.basicConfig(  # Configures global logging system (once)
        level=logging.INFO,
        # logger.info() ✅ shown
        # logger.warning() ✅ shown
        # logger.error() ✅ shown
        # logger.debug() ❌ hidden (unless level is changed)
        format="%(asctime)s %(levelname)s %(name)s - %(message)s", # Defines how each log line looks
    )

    # How to use:
    # import logging     Python’s built-in logging framework
    #
    # logger = logging.getLogger(__name__)
    #
    # getLogger(): If a logger with that name already exists → returns it, If not → creates it
    # __name__ = module’s import path (search)
