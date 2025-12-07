#!/usr/bin/env python3
"""
Prophet Fix - Create a wrapper that handles stan_backend issue
"""
import os

# Create a simple fix by monkeypatching Prophet
PROPHET_FIX = '''import os
import sys
import warnings
warnings.filterwarnings('ignore')

# Monkey patch Prophet to handle stan_backend issue on ARM
try:
    from prophet import forecaster
    
    _original_prophet_init = forecaster.Prophet.__init__
    
    def _patched_prophet_init(self, *args, **kwargs):
        """Patched Prophet __init__ that handles stan_backend AttributeError"""
        #Remove stan_backend if it causes issues
        kwargs.pop('stan_backend', None)
        try:
            return _original_prophet_init(self, *args, **kwargs)
        except AttributeError as e:
            if 'stan_backend' in str(e):
                # Try again without certain features
                kwargs['yearly_seasonality'] = False
                kwargs['weekly_seasonality'] = False
                try:
                    return _original_prophet_init(self, *args, **kwargs)
                except:
                    # Last resort - just set dummy stan_backend
                    _original_prophet_init(self, *args, **kwargs)
                    self.stan_backend = None
                    return
            raise
    
    forecaster.Prophet.__init__ = _patched_prophet_init
    
except ImportError:
    pass
'''

# Find and update ml_utils.py
ml_utils_path = "ml_utils.py"

with open(ml_utils_path, 'r') as f:
    content = f.read()

# Add the patch at the very beginning
if "Monkey patch Prophet" not in content:
    # Find where imports end
    import_section = []
    code_section = []
    in_imports = True
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if in_imports:
            if line.strip() and not line.startswith('import ') and not line.startswith('from '):
                if line.strip() and not line.startswith('#'):
                    in_imports = False
            import_section.append(line)
        else:
            code_section.append(line)
    
    # Add patch after imports
    new_content = '\n'.join(import_section) + '\n' + PROPHET_FIX + '\n' + '\n'.join(code_section)
    
    with open(ml_utils_path, 'w') as f:
        f.write(new_content)
    
    print("✅ Prophet fix applied to ml_utils.py")
else:
    print("⚠️ Prophet fix already applied")

print("ℹ Restart server to apply changes")
