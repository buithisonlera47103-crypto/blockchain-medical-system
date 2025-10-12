#!/bin/bash

# 逐个测试文件脚本
# 超时时间：6秒

TIMEOUT=6
LOG_FILE="individual-test-results.log"
FAILED_FILES="failed-test-files.txt"
TIMEOUT_FILES="timeout-test-files.txt"

> "$LOG_FILE"
> "$FAILED_FILES"
> "$TIMEOUT_FILES"

echo "开始逐个测试文件..." | tee -a "$LOG_FILE"
echo "超时设置: ${TIMEOUT}秒" | tee -a "$LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"

while IFS= read -r test_file; do
    echo "" | tee -a "$LOG_FILE"
    echo "测试文件: $test_file" | tee -a "$LOG_FILE"
    
    # 运行测试，设置超时
    timeout ${TIMEOUT}s npm test -- --testPathPattern="$test_file" --testTimeout=6000 > temp_test_output.txt 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 124 ]; then
        echo "  ❌ 超时 (>${TIMEOUT}秒)" | tee -a "$LOG_FILE"
        echo "$test_file" >> "$TIMEOUT_FILES"
    elif [ $EXIT_CODE -ne 0 ]; then
        # 统计错误数量
        ERROR_COUNT=$(grep -E "✕|FAIL" temp_test_output.txt | wc -l)
        echo "  ❌ 失败 (错误数: $ERROR_COUNT)" | tee -a "$LOG_FILE"
        
        if [ $ERROR_COUNT -gt 5 ]; then
            echo "  ⚠️  错误数 > 5，需要重写" | tee -a "$LOG_FILE"
            echo "$test_file (错误数: $ERROR_COUNT)" >> "$FAILED_FILES"
        fi
    else
        PASS_COUNT=$(grep -E "✓|passed" temp_test_output.txt | tail -1 | grep -oP '\d+ passed' | grep -oP '\d+' || echo "0")
        TIME=$(grep -E "Time:" temp_test_output.txt | tail -1 | grep -oP '[\d.]+\s*s' || echo "N/A")
        echo "  ✅ 通过 (测试数: $PASS_COUNT, 时间: $TIME)" | tee -a "$LOG_FILE"
    fi
    
    rm -f temp_test_output.txt
done < all-test-files.txt

echo "" | tee -a "$LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"
echo "测试完成！" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ -s "$TIMEOUT_FILES" ]; then
    echo "超时文件 (需要重写):" | tee -a "$LOG_FILE"
    cat "$TIMEOUT_FILES" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"

if [ -s "$FAILED_FILES" ]; then
    echo "失败文件 (错误>5，需要重写):" | tee -a "$LOG_FILE"
    cat "$FAILED_FILES" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "详细日志: $LOG_FILE"
echo "超时文件列表: $TIMEOUT_FILES"
echo "失败文件列表: $FAILED_FILES"

