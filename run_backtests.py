import os
import subprocess

def get_strategies():
    print("🔍 Quét toàn bộ Strategy trong hệ thống (Bỏ qua Thư mục Lỗi/Tương lai)...")
    strategies = []
    
    for root, dirs, files in os.walk("user_data/strategies"):
        if "futures" in root or "lookahead_bias" in root:
            continue
            
        for file in files:
            if file.endswith(".py") and file != "__init__.py":
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'IStrategy' in content:
                            for line in content.split('\n'):
                                if line.startswith('class ') and '(IStrategy)' in line:
                                    class_name = line.split('class ')[1].split('(')[0].strip()
                                    strategies.append(class_name)
                                    break
                except Exception:
                    pass
    
    ignore = ["GodStraNew", "Zeus", "DevilStra", "DoesNothingStrategy", "InformativeSample"]
    return [s for s in list(set(strategies)) if s not in ignore]

def run():
    strats = get_strategies()
    print(f"✅ Đã tìm thấy {len(strats)} chiến lược hợp lệ.")
    
    os.makedirs("user_data/backtest_logs", exist_ok=True)
    os.makedirs("user_data/backtest_summaries", exist_ok=True)
    
    total = len(strats)
    
    for i, strat in enumerate(strats, 1):
        summary_file = f"user_data/backtest_summaries/{strat}_summary.txt"
        log_file = f"user_data/backtest_logs/{strat}.log"
        
        # CHỨC NĂNG RESUME THÔNG MINH
        if os.path.exists(summary_file):
            with open(summary_file, 'r', encoding='utf-8') as sf:
                if "FAILED" not in sf.read():
                    print(f"⏭️  [{i}/{total}] Bỏ qua {strat} (Đã có sẵn kết quả từ lần chạy trước)")
                    continue
            
        print(f"\n🚀 [{i}/{total}] Đang chạy Backtest cho: {strat}")
        
        # Sửa lỗi: Cài đặt thư viện 'ta' hoặc 'yfinance' trước khi khởi động tiến trình Freqtrade
        bash_command = f"pip install ta yfinance >/dev/null 2>&1 && freqtrade backtesting --timeframe 5m --timerange 20240101- --recursive-strategy-search --config /freqtrade/user_data/config.json --strategy {strat}"
        
        cmd = [
            "docker", "compose", "run", "--rm", "--entrypoint", "/bin/bash", "freqtrade", "-c", bash_command
        ]
        
        try:
            # GIỚI HẠN THỜI GIAN: Bất cứ bot nào mất quá 8 PHÚT để chạy sẽ bị chém chết ngay lập tức
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=480)
        except subprocess.TimeoutExpired:
            print(f"❌ BÁO ĐỘNG ĐỎ: Chiến lược {strat} mất quá 8 phút! Bị Forced Kill để chống treo máy.")
            with open(log_file, "w", encoding='utf-8') as f:
                f.write("TIMEOUT EXPIRED (8 minutes) - Strategy loop computation is too heavy (O(N^2) bug detected).")
            # Tạo 1 file summary lỗi để đánh dấu lần sau không chạy lại
            with open(summary_file, "w", encoding='utf-8') as f:
                f.write("FAILED TO GENERATE PROFIT: Strategy infinite loop timed out.")
            continue
        
        # Lưu toàn bộ log raw 
        with open(log_file, "w", encoding='utf-8') as f:
            f.write(result.stdout)
            
        if "invalid reference format" in result.stdout:
            print(f"❌ Docker lỗi: invalid reference format. File docker-compose.yml cấu hình image sai.")
            break
            
        if result.returncode != 0:
            print(f"❌ Backtest bị lỗi Code/Thư viện (Python Exception) cho {strat}. Đã lưu log.")
            with open(summary_file, "w", encoding='utf-8') as sf: 
                sf.write("FAILED - TRACEBACK EXCEPTION. Lỗi code Python hoặc thiếu Indicator hiếm.")
            continue
            
        # Parse output để tìm bảng SUMMARY
        lines = result.stdout.split('\n')
        summary_lines = []
        is_summary = False
        
        for line in lines:
            if "BACKTESTING REPORT" in line or "======================== BACKTESTING REPORT" in line:
                is_summary = True
            
            if is_summary:
                summary_lines.append(line)
                
        if summary_lines:
            with open(summary_file, "w", encoding='utf-8') as sf:
                sf.write("\n".join(summary_lines))
            print(f"✅ Thành công! Đã trích xuất Summary: {summary_file}")
        else:
            print(f"⚠️ Chạy xong nhưng không tìm ra bảng Summary cho {strat}. Xem log đầy đủ để biết tại sao.")
            with open(summary_file, "w", encoding='utf-8') as sf:
                sf.write("FAILED - NO BACKTEST TABLE FOUND.")

if __name__ == "__main__":
    run()
    print("\n🎉 Toàn bộ tiến trình Backtest Đơn Lẻ đã kết thúc!")
