-- Egern 机场流量测试小组件
-- 用途：测试代理节点延迟、连接速度、流量
-- 使用方式：将此文件放入 Egern 的 widgets 目录

local Widget = require("c才知道urf.widget")
local http = require("socket.http")
local ltn12 = require("ltn12")
local socket = require("socket")
local json = require("cjson")

local TrafficTestWidget = Widget:extend()

-- 配置
local CONFIG = {
    testUrl = "http://www.gstatic.com/generate_204",  -- 测试URL
    testCount = 3,         -- 每次测试次数
    timeout = 10,          -- 超时时间(秒)
    servers = {}           -- 服务器列表(从订阅或手动添加)
}

function TrafficTestWidget:init()
    self.name = "流量测试"
    self.icon = "📡"
    self.interval = 300    -- 刷新间隔(秒)
    self.results = {}
    self.isRunning = false
end

function TrafficTestWidget:formatSpeed(bytes, time)
    local speed = bytes / time
    if speed > 1024 * 1024 then
        return string.format("%.1f MB/s", speed / (1024 * 1024))
    elseif speed > 1024 then
        return string.format("%.1f KB/s", speed / 1024)
    else
        return string.format("%.0f B/s", speed)
    end
end

function TrafficTestWidget:formatTime(ms)
    return string.format("%.0f ms", ms)
end

function TrafficTestWidget:testLatency(host, port)
    local start = socket.gettime()
    local sock = socket.tcp()
    sock:settimeout(CONFIG.timeout)
    
    local ok, err = sock:connect(host, port)
    if ok then
        sock:close()
        local latency = (socket.gettime() - start) * 1000
        return latency
    else
        sock:close()
        return -1
    end
end

function TrafficTestWidget:testSpeed(proxyHost, proxyPort)
    local startTime = socket.gettime()
    local bytesReceived = 0
    
    -- 模拟通过代理下载测试
    -- 使用已知大小的测试文件
    local testFile = "https://speed.cloudflare.com/__down?bytes=1000000"
    
    -- 简单实现，实际使用中可通过代理获取
    local body, code, headers = http.request{
        url = testFile,
        sink = ltn12.sink.table(),
        timeout = CONFIG.timeout
    }
    
    if code == 200 or code == 302 then
        local endTime = socket.gettime()
        local elapsed = endTime - startTime
        
        if body and type(body) == "table" then
            for _, v in ipairs(body) do
                bytesReceived = bytesReceived + #v
            end
        end
        
        local speed = bytesReceived / elapsed
        return speed, bytesReceived, elapsed
    end
    
    return 0, 0, 0
end

function TrafficTestWidget:testNode(node)
    local result = {
        name = node.name or "Unknown",
        latency = -1,
        speed = 0,
        status = "❌ 失败"
    }
    
    -- 提取主机和端口
    local host, port = string.match(node.host, "([^:]+):(%d+)")
    if not host then
        host = node.host
        port = node.port or 443
    end
    
    -- 测试延迟
    local latencies = {}
    for i = 1, CONFIG.testCount do
        local lat = self:testLatency(host, tonumber(port))
        if lat > 0 then
            table.insert(latencies, lat)
        end
        socket.sleep(0.1)
    end
    
    if #latencies > 0 then
        -- 计算平均延迟
        local sum = 0
        for _, v in ipairs(latencies) do
            sum = sum + v
        end
        result.latency = sum / #latencies
        
        -- 根据延迟评分
        if result.latency < 100 then
            result.status = "🟢 优秀"
        elseif result.latency < 300 then
            result.status = "🟡 良好"
        elseif result.latency < 500 then
            result.status = "🟠 一般"
        else
            result.status = "🔴 较差"
        end
        
        -- 测试速度
        local speed, bytes, time = self:testSpeed(host, port)
        if speed > 0 then
            result.speed = self:formatSpeed(bytes, time)
        end
    end
    
    return result
end

function TrafficTestWidget:runTests()
    if self.isRunning then
        return self.results
    end
    
    self.isRunning = true
    self.results = {}
    
    -- 获取所有节点
    local nodes = self:getAllNodes()
    
    for _, node in ipairs(nodes) do
        local result = self:testNode(node)
        table.insert(self.results, result)
    end
    
    -- 按延迟排序
    table.sort(self.results, function(a, b)
        if a.latency == -1 then return false end
        if b.latency == -1 then return true end
        return a.latency < b.latency
    end)
    
    self.isRunning = false
    return self.results
end

function TrafficTestWidget:getAllNodes()
    -- 从 Egern 配置中获取节点
    -- 实际实现需要根据 Egern 的 API 获取
    local nodes = {}
    
    -- 示例节点，实际使用时会从订阅获取
    if CONFIG.servers and #CONFIG.servers > 0 then
        for _, server in ipairs(CONFIG.servers) do
            table.insert(nodes, server)
        end
    end
    
    return nodes
end

function TrafficTestWidget:render()
    local view = Widget.View()
    
    -- 标题栏
    view:addRow({
        Widget.Text("📡 流量测试", {font = "Helvetica-Bold", size = 17}),
        Widget.Button("🔄", function()
            self:runTests()
        end)
    })
    
    -- 运行状态
    if self.isRunning then
        view:addRow({Widget.Text("⏳ 测试中...", {color = "#888888"})})
    end
    
    -- 结果列表
    if #self.results == 0 then
        view:addRow({Widget.Text("点击刷新按钮开始测试", {color = "#888888"})})
    else
        for i, result in ipairs(self.results) do
            local row = Widget.Row()
            
            -- 序号
            row:add(Widget.Text(string.format("%d.", i), {width = 25}))
            
            -- 节点名称
            local name = result.name
            if #name > 15 then
                name = string.sub(name, 1, 12) .. "..."
            end
            row:add(Widget.Text(name, {width = 100}))
            
            -- 延迟
            local latText = result.latency > 0 and self:formatTime(result.latency) or "--"
            row:add(Widget.Text(latText, {width = 60, align = "right"}))
            
            -- 速度
            local speedText = result.speed or "--"
            row:add(Widget.Text(speedText, {width = 80, align = "right"}))
            
            -- 状态
            row:add(Widget.Text(result.status, {width = 70}))
            
            view:addRow({row})
        end
    end
    
    -- 统计信息
    if #self.results > 0 then
        local totalNodes = #self.results
        local availableNodes = 0
        local avgLatency = 0
        local totalLatency = 0
        
        for _, r in ipairs(self.results) do
            if r.latency > 0 then
                availableNodes = availableNodes + 1
                totalLatency = totalLatency + r.latency
            end
        end
        
        if availableNodes > 0 then
            avgLatency = totalLatency / availableNodes
        end
        
        view:addRow({
            Widget.Text(string.format("节点: %d/%d 可用 | 平均延迟: %.0f ms", 
                availableNodes, totalNodes, avgLatency), 
                {color = "#666666", size = 12})
        })
    end
    
    -- 底部提示
    view:addRow({
        Widget.Text("延迟标准: 🟢<100ms 🟡<300ms 🟠<500ms 🔴>500ms", 
            {color = "#888888", size = 10})
    })
    
    return view
end

-- 导出
return TrafficTestWidget
