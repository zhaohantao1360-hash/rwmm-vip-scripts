#!/bin/bash
# Egern 机场流量测试脚本
# 用途：测试代理节点延迟、下载速度

# 配置
TEST_URL="http://www.gstatic.com/generate_204"
TEST_COUNT=3
TIMEOUT=10

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试延迟
test_latency() {
    local host=$1
    local port=${2:-443}
    
    local start=$(date +%s%N)
    curl -s -o /dev/null --connect-timeout $TIMEOUT --max-time $TIMEOUT "https://$host:$port" 2>/dev/null
    local end=$(date +%s%N)
    
    if [ $? -eq 0 ]; then
        local latency=$(( (end - start) / 1000000 ))
        echo $latency
    else
        echo "-1"
    fi
}

# 测试下载速度
test_speed() {
    local proxy=$1
    local url=${2:-"https://speed.cloudflare.com/__down?bytes=5000000"}
    
    local start=$(date +%s)
    local size=$(curl -s -x "$proxy" -o /dev/null -w "%{size_download}" --connect-timeout $TIMEOUT --max-time 30 "$url" 2>/dev/null)
    local end=$(date +%s)
    
    if [ -n "$size" ] && [ "$size" -gt 0 ]; then
        local time=$((end - start))
        if [ $time -gt 0 ]; then
            local speed=$((size / time))
            echo "$speed"
        else
            echo "0"
        fi
    else
        echo "0"
    fi
}

# 格式化速度
format_speed() {
    local speed=$1
    if [ $speed -gt 1048576 ]; then
        echo "$(echo "scale=1; $speed/1048576" | bc) MB/s"
    elif [ $speed -gt 1024 ]; then
        echo "$(echo "scale=1; $speed/1024" | bc) KB/s"
    else
        echo "${speed} B/s"
    fi
}

# 获取节点列表 (从订阅URL)
get_nodes() {
    local sub_url=$1
    if [ -z "$sub_url" ]; then
        echo "请提供订阅URL"
        return 1
    fi
    
    # 获取订阅内容并解码
    curl -s "$sub_url" | base64 -d 2>/dev/null || echo ""
}

# 主函数
main() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}   📡 Egern 机场流量测试工具${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    
    # 检查参数
    if [ $# -eq 0 ]; then
        echo "用法: $0 <订阅URL或节点URL>"
        echo ""
        echo "示例:"
        echo "  $0 https://your-sub-url.com/sub"
        echo "  $0 ss://xxxx@server:port"
        echo ""
        echo "节点格式支持:"
        echo "  - Shadowsocks (ss://)"
        echo "  - VMess (vmess://)"
        echo "  - Trojan (trojan://)"
        exit 0
    fi
    
    local input=$1
    
    # 如果是订阅URL，先获取节点列表
    if [[ "$input" == http*://* ]]; then
        echo -e "${YELLOW}正在获取订阅信息...${NC}"
        local nodes=$(get_nodes "$input")
        if [ -z "$nodes" ]; then
            echo -e "${RED}获取订阅失败${NC}"
            exit 1
        fi
    fi
    
    echo ""
    echo -e "${GREEN}开始测试...${NC}"
    echo ""
    
    # 测试延迟
    echo -e "${BLUE}延迟测试 (测试 $TEST_COUNT 次):${NC}"
    
    for i in $(seq 1 $TEST_COUNT); do
        echo -n "  第 $i 次: "
        local lat=$(test_latency "www.google.com" 443)
        if [ "$lat" != "-1" ]; then
            if [ $lat -lt 100 ]; then
                echo -e "${GREEN}${lat} ms${NC}"
            elif [ $lat -lt 300 ]; then
                echo -e "${YELLOW}${lat} ms${NC}"
            else
                echo -e "${RED}${lat} ms${NC}"
            fi
        else
            echo -e "${RED}超时${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}下载速度测试:${NC}"
    echo -n "  测试文件: 5MB"
    local start=$(date +%s)
    local size=$(curl -s -o /dev/null -w "%{size_download}" --max-time 30 "https://speed.cloudflare.com/__down?bytes=5000000" 2>/dev/null)
    local end=$(date +%s)
    local time=$((end - start))
    
    if [ -n "$size" ] && [ "$size" -gt 0 ] && [ $time -gt 0 ]; then
        local speed=$((size / time))
        echo -e "  ${GREEN}下载速度: $(format_speed $speed)${NC}"
        echo -e "  ${GREEN}耗时: ${time}s, 大小: $((size/1024/1024))MB${NC}"
    else
        echo -e "  ${RED}测试失败${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}   测试完成${NC}"
    echo -e "${BLUE}======================================${NC}"
}

# 运行
main "$@"
