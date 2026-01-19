window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});# -*- coding: utf-8 -*-
"""
时段管理自动化 V2 - 修复版
核心修复：
1. 时间选择使用坐标区分开始/结束选择器
2. 保存按钮使用坐标点击
"""
import time
from playwright.sync_api import sync_playwright

COOKIES_STR = """s_ViewType=10; WEBDFPID=5v9uxwv3050v565zzxvz40y7v7vv524080y0yv5wy4y97958yxy7vz11-1768110331408-1767847027766YKESWMU10f02007e9804b0b4cf483cebf1f9f513421; _lxsdk_cuid=19b9be4e4f6c8-0b3a51042db71a-8535026-1fa400-19b9be4e4f6c8; _lxsdk=19b9be4e4f6c8-0b3a51042db71a-8535026-1fa400-19b9be4e4f6c8; _hc.v=9dab3d56-ad66-d542-45a2-ae9d1e812714.1767847028; qruuid=8d09239d-dfa1-42b7-9db6-24af9bf5adf7; utm_source_rg=AM%25708xExE%25556; fspop=test; ctu=c5c61393c62557f539c833eb25c64f8fb26f333383acfbea33ffc5cfc98b8acd; PHOENIX_ID=0a63bfa7-19b9d5bc948-345314; bizType=2; edper=p3lTfeGkMKRdLOXR1olqOFYRDAcI-EtQpqfmYJm38WA3BsrclRKx8KGnuWkFr22PqChchyFlYZsYQhElkYvU0w; ecom_kdb_to_jyb_gray_flag=1; logan_session_token=ff5ljq8cz316r78sy3hw; mpmerchant_portal_shopid=1418925265; merchantBookShopID=1418925265; merchantCategoryID=2890"""

TIMESLOTS = [
    {'start': '12:00', 'end': '17:00'},
    {'start': '12:00', 'end': '18:00'},
    {'start': '12:00', 'end': '20:00'},
    {'start': '16:00', 'end': '21:00'},
    {'start': '18:00', 'end': '05:00', 'next_day': True},
    {'start': '23:00', 'end': '05:00', 'next_day': True},
]

def parse_cookies(s):
    return [{'name': n, 'value': v, 'domain': '.dianping.com', 'path': '/'} 
            for item in s.split('; ') if '=' in item for n, v in [item.split('=', 1)]]

print("="*60)
print("时段管理自动化 V2")
print("="*60)

pw = sync_playwright().start()
browser = pw.chromium.launch(headless=False)
ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
ctx.add_cookies(parse_cookies(COOKIES_STR))
page = ctx.new_page()

print("\n[1] 访问页面...")
page.goto("https://e.dianping.com/sc/pc/merchant/book-meal-page", wait_until='networkidle', timeout=60000)
time.sleep(2)

print("[2] 进入包房时段管理...")
page.locator('text=包房时段管理').first.click()
time.sleep(3)

iframe = page.frame_locator('iframe').first
frame = page.frames[1] if len(page.frames) > 1 else page.main_frame

page.evaluate("window.scrollTo(0, 1000)")
time.sleep(1)

print("[3] 进入编辑模式...")
iframe.locator('text=编辑时段库存').first.click()
time.sleep(2)

# ==================== 删除所有时段 ====================
print("\n[4] 删除所有时段...")
deleted_count = 0
for _ in range(20):
    # 找y坐标大于600的删除按钮（时段区域）
    result = frame.evaluate('''() => {
        let btns = document.querySelectorAll('button');
        for (let btn of btns) {
            let rect = btn.getBoundingClientRect();
            if (btn.textContent.trim() === '删除' && rect.y > 600 && rect.y < 1200) {
                btn.click();
                return true;
            }
        }
        return false;
    }''')
    if not result:
        break
    time.sleep(0.3)
    # 点击确定
    frame.evaluate('''() => {
        let btns = document.querySelectorAll('button');
        for (let btn of btns) {
            if (btn.textContent.trim() === '确定') { btn.click(); break; }
        }
    }''')
    time.sleep(0.3)
    deleted_count += 1
    print(f"    删除第{deleted_count}个 ✓")

print(f"\n    共删除 {deleted_count} 个时段")

# ==================== 添加时段 ====================
print("\n[5] 录入新时段...")

for i, ts in enumerate(TIMESLOTS):
    start_h = ts['start'].split(':')[0]
    end_h = ts['end'].split(':')[0]
    is_next_day = ts.get('next_day', False)
    
    print(f"\n    [{i+1}] 添加 {ts['start']}-{ts['end']}")
    
    # 1. 点击+添加时段
    frame.evaluate('''() => {
        let btns = document.querySelectorAll('button, span');
        for (let el of btns) {
            if (el.textContent.includes('+添加时段')) { el.click(); break; }
        }
    }''')
    time.sleep(0.3)
    
    # 2. 点击开始时间输入框
    frame.evaluate('''() => {
        document.querySelector('input[placeholder="开始时间"]').click();
    }''')
    time.sleep(0.2)
    
    # 3. 选择开始小时 - 只选择x坐标在650-750之间的（开始时间列）
    frame.evaluate(f'''() => {{
        let lis = document.querySelectorAll('li.common-list-item');
        for (let li of lis) {{
            let rect = li.getBoundingClientRect();
            if (li.textContent.trim() === '{start_h}' && rect.x > 650 && rect.x < 750) {{
                li.scrollIntoView({{block: 'center'}});
                li.click();
                return;
            }}
        }}
    }}''')
    time.sleep(0.2)
    
    # 4. 点击结束时间输入框
    frame.evaluate('''() => {
        document.querySelector('input[placeholder="结束时间"]').click();
    }''')
    time.sleep(0.2)
    
    # 5. 如果是次日，点击次日
    if is_next_day:
        frame.evaluate('''() => {
            let lis = document.querySelectorAll('li.common-list-item');
            for (let li of lis) {
                if (li.textContent.trim() === '次日') { li.click(); break; }
            }
        }''')
        time.sleep(0.1)
    
    # 6. 选择结束小时 - 只选择x坐标在850-950之间的（结束时间列）
    frame.evaluate(f'''() => {{
        let lis = document.querySelectorAll('li.common-list-item');
        for (let li of lis) {{
            let rect = li.getBoundingClientRect();
            if (li.textContent.trim() === '{end_h}' && rect.x > 850 && rect.x < 950) {{
                li.scrollIntoView({{block: 'center'}});
                li.click();
                return;
            }}
        }}
    }}''')
    time.sleep(0.2)
    
    # 7. 点击弹窗内的保存按钮 - 使用坐标（y在550-600之间的保存按钮）
    frame.evaluate('''() => {
        let btns = document.querySelectorAll('button.mtd-btn-primary');
        for (let btn of btns) {
            let rect = btn.getBoundingClientRect();
            if (btn.textContent.includes('保存') && rect.y > 500 && rect.y < 650) {
                btn.click();
                return;
            }
        }
    }''')
    time.sleep(0.5)
    print(f"        已保存 ✓")

# ==================== 复制到其他日期 ====================
print("\n[6] 复制到其他日期...")

frame.evaluate('''() => {
    let btns = document.querySelectorAll('button');
    for (let btn of btns) {
        if (btn.textContent.includes('复制到其他日期')) { btn.click(); break; }
    }
}''')
time.sleep(0.5)

# 勾选周二~周日
for day in ['周二', '周三', '周四', '周五', '周六', '周日']:
    frame.evaluate(f'''() => {{
        let labels = document.querySelectorAll('label');
        for (let label of labels) {{
            if (label.textContent.includes('{day}')) {{ label.click(); break; }}
        }}
    }}''')
    time.sleep(0.1)
    print(f"    勾选{day} ✓")

# 确定 - 先滚动使按钮可见，然后用键盘或点击
# 方法1: 滚动iframe内容使确定按钮可见
frame.evaluate('''() => {
    let btn = null;
    let btns = document.querySelectorAll('button.mtd-btn-primary');
    for (let b of btns) {
        if (b.textContent.trim() === '确定') { btn = b; break; }
    }
    if (btn) {
        btn.scrollIntoView({block: 'center'});
        setTimeout(() => btn.click(), 100);
    }
}''')
time.sleep(0.5)

# 方法2: 用键盘Tab到确定按钮并按Enter
page.keyboard.press('Tab')
time.sleep(0.1)
page.keyboard.press('Enter')
time.sleep(0.5)

# 检查弹窗是否关闭
modal_closed = frame.evaluate('''() => {
    let modals = document.querySelectorAll('.mtd-modal-wrapper');
    for (let m of modals) {
        if (m.offsetWidth > 0 && m.textContent.includes('复制至其他日期')) return false;
    }
    return true;
}''')

if not modal_closed:
    # 方法3: 直接坐标点击 - 根据截图确定按钮大约在(830, 350)相对于iframe
    # iframe偏移约(0, 222)
    page.mouse.click(830, 572)
    print("    坐标点击确定按钮")
    time.sleep(0.5)

print("    复制完成 ✓")

# ==================== 保存时段库存 ====================
print("\n[7] 保存时段库存...")
frame.evaluate('''() => {
    let btns = document.querySelectorAll('button');
    for (let btn of btns) {
        if (btn.textContent.includes('保存时段库存')) { btn.click(); break; }
    }
}''')
time.sleep(2)
print("    保存成功! ✓")

print("\n" + "="*60)
print("完成!")
print("="*60)

page.screenshot(path='timeslot_result.png')
print("截图: timeslot_result.png")

print("\n保持60秒查看结果...")
time.sleep(60)

browser.close()
pw.stop()
