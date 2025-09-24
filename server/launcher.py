# launcher.py
import sys
import os
import uvicorn

# Ajustar directorio de trabajo si estamos en PyInstaller (--onefile)
if getattr(sys, "frozen", False):
    os.chdir(os.path.dirname(sys.executable))

# Configuración de host y puerto
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", 8000))
LOG_LEVEL = "info"

# Ejecutar FastAPI desde main.py
uvicorn.run(
    "main:app",    # Nombre de tu archivo principal y variable app
    host=HOST,
    port=PORT,
    log_level=LOG_LEVEL,
    reload=False   # Muy importante: desactivar reload en ejecutable
)

