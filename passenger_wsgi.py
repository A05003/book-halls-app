import sys
import os

# إضافة مسار المشروع للـ Python Path
sys.path.insert(0, os.path.dirname(__file__))

from a2wsgi import ASGIMiddleware
from app.main import app

# تحويل FastAPI (ASGI) إلى WSGI ليفهمه سيرفر Passenger في Hostinger
application = ASGIMiddleware(app)