
import sys
import json
import os
import shutil
import time
import hashlib
import random

from tqdm import tqdm
from PIL import ImageDraw
from PIL import Image as ImageModule
from PIL.Image import Image
from PIL.Image import open as openImage        

filePath = "D:\\liqi\\liqi_unity2022_pic\\MyAssets\\extendRes\\background\\beijing_22summer\\beijing_22summer.jpg"
fileBuffer = open(filePath, "rb")
md5 = hashlib.md5(fileBuffer.read()).hexdigest()
print(md5)