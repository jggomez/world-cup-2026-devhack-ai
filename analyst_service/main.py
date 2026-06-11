import os
import sys
from dotenv import load_dotenv

# Ensure analyst_service directory is in the PYTHONPATH so python can resolve 'app' package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
