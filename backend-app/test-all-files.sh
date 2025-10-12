#!/bin/bash
# 测试所有文件并记录失败的测试

FAILED_TESTS=()
TIMEOUT_TESTS=()
PASSED_TESTS=0
TOTAL_TESTS=0

# 获取所有测试文件
TEST_FILES=$(find test -name "*.test.ts" -type f | sort)

echo "开始测试所有测试文件..."
echo "======================================"

for file in $TEST_FILES; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $file ... "
    
    # 运行测试，设置6秒超时
    if timeout 6 npm test -- "$file" --testTimeout=5000 > /tmp/test_output.log 2>&1; then
        echo "✓ PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            echo "✕ TIMEOUT"
            TIMEOUT_TESTS+=("$file")
        else
            # 检查是否有实际错误
            if grep -q "FAIL\|Error\|✕" /tmp/test_output.log; then
                echo "✕ FAIL"
                FAILED_TESTS+=("$file")
            else
                echo "✓ PASS (with warnings)"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            fi
        fi
    fi
done

echo ""
echo "======================================"
echo "测试摘要:"
echo "总测试文件数: $TOTAL_TESTS"
echo "通过: $PASSED_TESTS"
echo "失败: ${#FAILED_TESTS[@]}"
echo "超时: ${#TIMEOUT_TESTS[@]}"
echo ""

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo "失败的测试文件:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    echo ""
fi

if [ ${#TIMEOUT_TESTS[@]} -gt 0 ]; then
    echo "超时的测试文件 (>6秒):"
    for test in "${TIMEOUT_TESTS[@]}"; do
        echo "  - $test"
    done
fi

