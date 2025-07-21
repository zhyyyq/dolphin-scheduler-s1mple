import logging
import sys
from loguru import logger

def setup_logger():
    logging.basicConfig(handlers=[], level=logging.DEBUG, force=True)

