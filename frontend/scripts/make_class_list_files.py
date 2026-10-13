"""Class list spreadsheets: the template teachers download, and real-looking files the import tests read.

* public/assets/classes/mau-danh-sach-lop.xlsx: "STT | Họ và tên", three example rows.
* src/utils/__fixtures__/class-lists/*.xlsx:
  - vnedu.xlsx: school title rows (merged), header with "Họ và tên" among other columns, names in capitals, a blank
    row, then the footer and a signature (whose name must not be imported).
  - split.xlsx: "Họ đệm" and "Tên" in two columns.
  - no-header.xlsx: names and birth dates only.

Usage: python3 scripts/make_class_list_files.py   (needs openpyxl)
"""
import datetime
import os

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

FIXTURES = 'src/utils/__fixtures__/class-lists'


def save(wb, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Fixed timestamps, so regenerating does not change the files.
    wb.properties.created = wb.properties.modified = datetime.datetime(2026, 1, 1)
    wb.save(path)


def template():
    wb = Workbook()
    ws = wb.active
    ws.title = 'Danh sách lớp'
    ws.append(['STT', 'Họ và tên'])
    for i, name in enumerate(['Nguyễn Minh Anh', 'Trần Gia Huy', 'Lê Bảo Ngọc'], start=1):
        ws.append([i, name])
    for cell in ws[1]:
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='3563E9')
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 32
    ws['D1'] = 'Mỗi dòng một học sinh. Xóa các dòng ví dụ rồi nhập tên các em vào cột "Họ và tên".'
    ws['D1'].font = Font(italic=True, color='5A6788')
    save(wb, 'public/assets/classes/mau-danh-sach-lop.xlsx')


def vnedu():
    wb = Workbook()
    ws = wb.active
    ws.append(['PHÒNG GD&ĐT QUẬN 1'])
    ws.append(['TRƯỜNG TIỂU HỌC KIM ĐỒNG'])
    ws.append([])
    ws.append(['DANH SÁCH HỌC SINH LỚP 3A - NĂM HỌC 2026-2027'])
    ws.merge_cells('A4:F4')
    ws['A4'].alignment = Alignment(horizontal='center')
    ws.append([])
    ws.append(['STT', 'Mã học sinh', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Ghi chú'])
    rows = [
        ('0123456781', 'NGUYỄN MINH ANH', datetime.date(2018, 3, 2), 'Nữ'),
        ('0123456782', 'Trần Gia Huy', datetime.date(2018, 7, 14), 'Nam'),
        ('0123456783', 'tống sơn tùng', datetime.date(2018, 1, 9), 'Nam'),
        ('0123456784', 'Lê   Bảo Ngọc', datetime.date(2018, 11, 30), 'Nữ'),
    ]
    for i, (code, name, born, sex) in enumerate(rows, start=1):
        ws.append([i, code, name, born, sex, None])
    ws.append([])
    ws.append([5, '0123456785', 'Phạm Thu Hà', datetime.date(2018, 5, 5), 'Nữ'])
    ws.append([])
    ws.append(['Tổng số: 5 học sinh'])
    ws.append(['', '', 'Hà Nội, ngày 5 tháng 9 năm 2026'])
    ws.append(['', '', 'Người lập biểu'])
    ws.append(['', '', 'Nguyễn Thị Lan'])
    save(wb, f'{FIXTURES}/vnedu.xlsx')


def split():
    wb = Workbook()
    ws = wb.active
    ws.append(['STT', 'Họ đệm', 'Tên', 'Lớp'])
    for i, (family, given) in enumerate([('Nguyễn Minh', 'Anh'), ('Trần Gia', 'Huy'), ('Võ', 'An')], start=1):
        ws.append([i, family, given, '3A'])
    save(wb, f'{FIXTURES}/split.xlsx')


def no_header():
    wb = Workbook()
    ws = wb.active
    for name, born in [('Nguyễn Minh Anh', '02/03/2018'), ('Trần Gia Huy', '14/07/2018'), ('Lê Bảo Ngọc', '30/11/2018')]:
        ws.append([born, name])
    save(wb, f'{FIXTURES}/no-header.xlsx')


if __name__ == '__main__':
    template()
    vnedu()
    split()
    no_header()
    print('class list files written')
