import sys
sys.stdout.reconfigure(encoding='utf-8')
import PyPDF2

with open('dreamstep_Rjy_16183917468142.pdf', 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    total = len(reader.pages)
    print(f'Total pages: {total}')
    print()
    for i in range(total):
        page = reader.pages[i]
        text = page.extract_text()
        if text and text.strip():
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            ward_lines = [l for l in lines if 'WARD' in l.upper()]
            summary = ' | '.join(ward_lines[:5])
            print(f'PAGE {i+1}: {summary}')
        else:
            print(f'PAGE {i+1}: [image/scan only]')
