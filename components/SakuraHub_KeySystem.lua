local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

local FLOWAUTH_LOADER_URL = "https://flowauth.net/v1/loaders/59bfc460ab5618f3f1acf91cb6fdfcc9.lua"
local FLOWAUTH_KEY_SAVE_PATH = "SakuraHub/Key.txt"
local DISCORD_URL = "https://discord.gg/joinsakura"

-- Dynamic routing: FlowAuth decides whether the current game is keyless or keyed.
-- Do not hardcode game IDs here. The same loader automatically follows changes
-- made to the Sakura Hub project dashboard.

if getgenv().SakuraHubKeySystemLoaded then return end
getgenv().SakuraHubKeySystemLoaded = true

local function tween(object, properties, duration, easingStyle, easingDirection)
	duration = duration or 0.3
	easingStyle = easingStyle or Enum.EasingStyle.Quad
	easingDirection = easingDirection or Enum.EasingDirection.Out
	local tweenInfo = TweenInfo.new(duration, easingStyle, easingDirection)
	local t = TweenService:Create(object, tweenInfo, properties)
	t:Play()
	return t
end

local function createRipple(button, x, y)
	task.spawn(function()
		local size = button.AbsoluteSize
		local maxSize = math.max(size.X, size.Y) * 2.5
		local ripple = Instance.new("Frame")
		ripple.Name = "Ripple"
		ripple.Size = UDim2.new(0, 0, 0, 0)
		ripple.Position = UDim2.new(0, x - button.AbsolutePosition.X, 0, y - button.AbsolutePosition.Y)
		ripple.AnchorPoint = Vector2.new(0.5, 0.5)
		ripple.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
		ripple.BackgroundTransparency = 0.7
		ripple.BorderSizePixel = 0
		ripple.ZIndex = button.ZIndex + 10
		ripple.Parent = button
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(1, 0)
		corner.Parent = ripple
		local tweenInfo = TweenInfo.new(0.5, Enum.EasingStyle.Quart, Enum.EasingDirection.Out)
		local goal = { Size = UDim2.new(0, maxSize, 0, maxSize), BackgroundTransparency = 1 }
		local tw = TweenService:Create(ripple, tweenInfo, goal)
		tw:Play()
		tw.Completed:Wait()
		ripple:Destroy()
	end)
end

local function saveKey(key)
	pcall(function()
		if not isfolder("SakuraHub") then makefolder("SakuraHub") end
		writefile(FLOWAUTH_KEY_SAVE_PATH, key)
	end)
end

local function loadSavedKey()
	local ok, key = pcall(function()
		if isfile(FLOWAUTH_KEY_SAVE_PATH) then return readfile(FLOWAUTH_KEY_SAVE_PATH) end
		return nil
	end)
	if ok and key and #key:gsub("%s", "") > 0 then
		return key:gsub("%s+$", ""):gsub("^%s+", "")
	end
	return nil
end

local function deleteSavedKey()
	pcall(function()
		if isfile(FLOWAUTH_KEY_SAVE_PATH) then delfile(FLOWAUTH_KEY_SAVE_PATH) end
	end)
end

-- Execute the FlowAuth loader exactly like the UI template does.
-- Spawn the loader in a thread and wait up to 4s.
-- If it errors within 4s -> key is bad. If it runs longer -> script is executing -> key is good.
local function executeFlowAuth(key)
	getgenv().script_key = key
	if _G then _G.script_key = key end

	local done = false
	local ok = false
	local err = nil

	task.spawn(function()
		local runOk, runErr = pcall(function()
			local body = game:HttpGet(FLOWAUTH_LOADER_URL, true)
			if type(body) ~= "string" or #body < 16 then
				error("Empty or invalid loader response")
			end

			local fn, loadErr = loadstring(body)
			if not fn then
				error("Loader parse error: " .. tostring(loadErr))
			end

			local execOk, execErr = pcall(fn)
			if not execOk then
				error(execErr)
			end
		end)

		ok = runOk
		err = runErr
		done = true
	end)

	local started = os.clock()
	while not done and os.clock() - started < 6 do
		task.wait()
	end

	if done then
		return ok, err
	end
	-- Timed out = script is still running = success
	return true
end


-- Ask FlowAuth first with no key. If the current game is marked keyless,
-- FlowAuth accepts and runs it. If it is keyed, FlowAuth rejects this probe
-- and the normal saved-key/UI flow continues.
local keylessOk, keylessErr = executeFlowAuth(nil)
if keylessOk then
    getgenv().SakuraHubKeySystemLoaded = false
    print("[SakuraHub] FlowAuth marked this game keyless; skipped key UI.")
    return
end

local ScreenGui1 = nil

local function tryAutoLogin()
	local savedKey = loadSavedKey()
	if not savedKey then return false end

	local ok, err = executeFlowAuth(savedKey)
	if ok then
		getgenv().SakuraHubKeySystemLoaded = false
		if ScreenGui1 then pcall(function() ScreenGui1:Destroy() end) end
		return true
	else
		local msg = tostring(err or ""):lower()
		-- Only treat as HWID mismatch if the error explicitly says so
		if msg:find("linked to another device") or msg:find("hwid mismatch") or msg:find("device mismatch") then
			warn("[SakuraHub] Key is linked to another device. Please reset your key or use a new one.")
			deleteSavedKey()
			return false, "HWID"
		elseif msg:find("expired") or msg:find("expir") or msg:find("inactive") then
			deleteSavedKey()
			return false, "EXPIRED"
		elseif msg:find("invalid") or msg:find("not found") or msg:find("wrong") or msg:find("unauthorized") then
			deleteSavedKey()
			return false, "INVALID"
		else
			-- Don't delete key on unknown errors (could be temporary/network issue)
			warn("[SakuraHub] Validation error: " .. tostring(err))
			return false, "UNKNOWN"
		end
	end
end

local autoLoginOk, autoLoginErr = tryAutoLogin()
if autoLoginOk then
	print("[SakuraHub] Auto-login handled.")
	return
end

local startupError = autoLoginErr

ScreenGui1 = Instance.new("ScreenGui")
ScreenGui1.Name = "SakuraHubKeySystem"
ScreenGui1.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ScreenGui1.ResetOnSpawn = false
ScreenGui1.IgnoreGuiInset = true
ScreenGui1.Parent = PlayerGui

pcall(function()
	if gethui then
		ScreenGui1.Parent = gethui()
	elseif syn and syn.protect_gui then
		syn.protect_gui(ScreenGui1)
		ScreenGui1.Parent = game:GetService("CoreGui")
	end
end)

local Backdrop = Instance.new("Frame")
Backdrop.Name = "Backdrop"
Backdrop.Size = UDim2.new(1, 0, 1, 0)
Backdrop.Position = UDim2.new(0, 0, 0, 0)
Backdrop.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
Backdrop.BackgroundTransparency = 1
Backdrop.BorderSizePixel = 0
Backdrop.ZIndex = 0
Backdrop.Parent = ScreenGui1

local Background2 = Instance.new("Frame")
Background2.Name = "Background"
Background2.Size = UDim2.new(0, 380, 0, 0)
Background2.Position = UDim2.new(0.5, 0, 0.5, 0)
Background2.AnchorPoint = Vector2.new(0.5, 0.5)
Background2.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
Background2.BackgroundTransparency = 0.05
Background2.BorderSizePixel = 0
Background2.Visible = true
Background2.ZIndex = 2
Background2.AutomaticSize = Enum.AutomaticSize.Y
Background2.ClipsDescendants = true
Background2.Parent = ScreenGui1

local UICorner4 = Instance.new("UICorner")
UICorner4.CornerRadius = UDim.new(0, 16)
UICorner4.Parent = Background2

local MainStroke = Instance.new("UIStroke")
MainStroke.Color = Color3.fromRGB(255, 255, 255)
MainStroke.Thickness = 1.2
MainStroke.Transparency = 0.85
MainStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
MainStroke.Parent = Background2

local Shadow32 = Instance.new("ImageLabel")
Shadow32.Name = "Shadow"
Shadow32.Size = UDim2.new(1, 40, 1, 40)
Shadow32.Position = UDim2.new(0.5, 0, 0.5, 0)
Shadow32.AnchorPoint = Vector2.new(0.5, 0.5)
Shadow32.BackgroundTransparency = 1
Shadow32.BorderSizePixel = 0
Shadow32.Image = "rbxassetid://1316045217"
Shadow32.ImageColor3 = Color3.fromRGB(255, 255, 255)
Shadow32.ImageTransparency = 0.92
Shadow32.ScaleType = Enum.ScaleType.Slice
Shadow32.SliceCenter = Rect.new(10, 10, 118, 118)
Shadow32.ZIndex = 1
Shadow32.Parent = Background2

local DPIScale = Instance.new("UIScale")
DPIScale.Name = "DPIScale"
DPIScale.Scale = 1
DPIScale.Parent = Background2

local DPI_BASE_RESOLUTION = Vector2.new(1920, 1080)
local DPI_MIN_SCALE = 0.75
local DPI_MAX_SCALE = 1.4

local function updateDPIScale()
	local camera = workspace.CurrentCamera
	if not camera then return end
	local viewport = camera.ViewportSize
	if viewport.X <= 0 or viewport.Y <= 0 then return end
	local scale = math.min(viewport.X / DPI_BASE_RESOLUTION.X, viewport.Y / DPI_BASE_RESOLUTION.Y)
	if UserInputService.TouchEnabled and not UserInputService.MouseEnabled then
		scale = scale * 1.15
	end
	scale = math.clamp(scale, DPI_MIN_SCALE, DPI_MAX_SCALE)
	TweenService:Create(DPIScale, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {Scale = scale}):Play()
end
updateDPIScale()

do
	local currentCamera = workspace.CurrentCamera
	if currentCamera then
		currentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateDPIScale)
	end
	workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(function()
		local newCamera = workspace.CurrentCamera
		if newCamera then
			newCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateDPIScale)
			updateDPIScale()
		end
	end)
end

local Left6 = Instance.new("CanvasGroup")
Left6.Name = "Left"
Left6.Size = UDim2.new(1, 0, 1, 0)
Left6.BackgroundTransparency = 1
Left6.BorderSizePixel = 0
Left6.ClipsDescendants = true
Left6.GroupTransparency = 0
Left6.Parent = Background2

local UIPadding7 = Instance.new("UIPadding")
UIPadding7.PaddingTop = UDim.new(0, 18)
UIPadding7.PaddingBottom = UDim.new(0, 18)
UIPadding7.PaddingLeft = UDim.new(0, 18)
UIPadding7.PaddingRight = UDim.new(0, 18)
UIPadding7.Parent = Left6

local UIListLayout8 = Instance.new("UIListLayout")
UIListLayout8.Padding = UDim.new(0, 12)
UIListLayout8.FillDirection = Enum.FillDirection.Vertical
UIListLayout8.HorizontalAlignment = Enum.HorizontalAlignment.Left
UIListLayout8.VerticalAlignment = Enum.VerticalAlignment.Top
UIListLayout8.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout8.Parent = Left6

local TItleIcon9 = Instance.new("Frame")
TItleIcon9.Name = "TitleIcon"
TItleIcon9.Size = UDim2.new(0, 120, 0, 24)
TItleIcon9.BackgroundTransparency = 1
TItleIcon9.BorderSizePixel = 0
TItleIcon9.ZIndex = 3
TItleIcon9.Parent = Left6

local UIListLayout10 = Instance.new("UIListLayout")
UIListLayout10.Padding = UDim.new(0, 10)
UIListLayout10.FillDirection = Enum.FillDirection.Horizontal
UIListLayout10.HorizontalAlignment = Enum.HorizontalAlignment.Left
UIListLayout10.VerticalAlignment = Enum.VerticalAlignment.Center
UIListLayout10.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout10.Parent = TItleIcon9

local ImageLabel11 = Instance.new("ImageLabel")
ImageLabel11.Name = "LogoIcon"
ImageLabel11.Size = UDim2.new(0, 22, 0, 22)
ImageLabel11.BackgroundTransparency = 1
ImageLabel11.BorderSizePixel = 0
ImageLabel11.Image = "rbxassetid://101833678008843"
ImageLabel11.ImageColor3 = Color3.fromRGB(255, 255, 255)
ImageLabel11.ImageTransparency = 0
ImageLabel11.ScaleType = Enum.ScaleType.Fit
ImageLabel11.ZIndex = 3
ImageLabel11.Parent = TItleIcon9

local TextLabel12 = Instance.new("TextLabel")
TextLabel12.Name = "TitleText"
TextLabel12.Size = UDim2.new(0, 0, 0, 24)
TextLabel12.BackgroundTransparency = 1
TextLabel12.BorderSizePixel = 0
TextLabel12.AutomaticSize = Enum.AutomaticSize.X
TextLabel12.ZIndex = 3
TextLabel12.Text = "SAKURA HUB"
TextLabel12.TextColor3 = Color3.fromRGB(255, 255, 255)
TextLabel12.TextSize = 14
TextLabel12.Font = Enum.Font.GothamBold
TextLabel12.TextScaled = false
TextLabel12.TextWrapped = false
TextLabel12.TextTransparency = 0
TextLabel12.TextXAlignment = Enum.TextXAlignment.Left
TextLabel12.TextYAlignment = Enum.TextYAlignment.Center
TextLabel12.Parent = TItleIcon9

local adsframe13 = Instance.new("Frame")
adsframe13.Name = "WelcomeFrame"
adsframe13.Size = UDim2.new(1, 0, 0, 0)
adsframe13.BackgroundTransparency = 1
adsframe13.BorderSizePixel = 0
adsframe13.AutomaticSize = Enum.AutomaticSize.Y
adsframe13.ZIndex = 3
adsframe13.LayoutOrder = 1
adsframe13.Parent = Left6

local ads14 = Instance.new("TextLabel")
ads14.Name = "WelcomeText"
ads14.Size = UDim2.new(1, 0, 1, 0)
ads14.BackgroundTransparency = 1
ads14.BorderSizePixel = 0
ads14.AutomaticSize = Enum.AutomaticSize.Y
ads14.ZIndex = 3
ads14.Text = "Sakura Hub\n<font color='rgb(255, 255, 255)'>Key System</font>"
ads14.TextColor3 = Color3.fromRGB(255, 255, 255)
ads14.TextSize = 26
ads14.Font = Enum.Font.GothamBold
ads14.TextScaled = false
ads14.TextWrapped = true
ads14.RichText = true
ads14.TextTransparency = 0
ads14.TextXAlignment = Enum.TextXAlignment.Left
ads14.TextYAlignment = Enum.TextYAlignment.Center
ads14.Parent = adsframe13

local KeyFrame15 = Instance.new("Frame")
KeyFrame15.Name = "KeyFrame"
KeyFrame15.Size = UDim2.new(1, 0, 0, 0)
KeyFrame15.BackgroundTransparency = 1
KeyFrame15.BorderSizePixel = 0
KeyFrame15.AutomaticSize = Enum.AutomaticSize.Y
KeyFrame15.ZIndex = 3
KeyFrame15.LayoutOrder = 2
KeyFrame15.Parent = Left6

local UIListLayout16 = Instance.new("UIListLayout")
UIListLayout16.Padding = UDim.new(0, 8)
UIListLayout16.FillDirection = Enum.FillDirection.Vertical
UIListLayout16.HorizontalAlignment = Enum.HorizontalAlignment.Left
UIListLayout16.VerticalAlignment = Enum.VerticalAlignment.Top
UIListLayout16.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout16.Parent = KeyFrame15

local TextLabel17 = Instance.new("TextLabel")
TextLabel17.Name = "KeyLabel"
TextLabel17.Size = UDim2.new(1, 0, 0, 22)
TextLabel17.BackgroundTransparency = 1
TextLabel17.BorderSizePixel = 0
TextLabel17.ZIndex = 3
TextLabel17.Text = "License Key"
TextLabel17.TextColor3 = Color3.fromRGB(255, 255, 255)
TextLabel17.TextSize = 12
TextLabel17.Font = Enum.Font.Gotham
TextLabel17.TextTransparency = 0.3
TextLabel17.TextXAlignment = Enum.TextXAlignment.Left
TextLabel17.TextYAlignment = Enum.TextYAlignment.Center
TextLabel17.Parent = KeyFrame15

local Frame18 = Instance.new("Frame")
Frame18.Name = "KeyIcon"
Frame18.Size = UDim2.new(0, 18, 0, 18)
Frame18.Position = UDim2.new(1, 0, 0.5, 0)
Frame18.AnchorPoint = Vector2.new(1, 0.5)
Frame18.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Frame18.BackgroundTransparency = 0.6
Frame18.BorderSizePixel = 0
Frame18.ZIndex = 3
Frame18.Parent = TextLabel17

local UICorner19 = Instance.new("UICorner")
UICorner19.CornerRadius = UDim.new(1, 0)
UICorner19.Parent = Frame18

local ImageLabel20 = Instance.new("ImageLabel")
ImageLabel20.Name = "KeyIconImg"
ImageLabel20.Size = UDim2.new(0, 12, 0, 12)
ImageLabel20.Position = UDim2.new(0.5, 0, 0.5, 0)
ImageLabel20.AnchorPoint = Vector2.new(0.5, 0.5)
ImageLabel20.BackgroundTransparency = 1
ImageLabel20.BorderSizePixel = 0
ImageLabel20.Image = "rbxassetid://13868333926"
ImageLabel20.ImageColor3 = Color3.fromRGB(0, 0, 0)
ImageLabel20.ImageTransparency = 0
ImageLabel20.ZIndex = 4
ImageLabel20.Parent = Frame18

local Keybox22 = Instance.new("Frame")
Keybox22.Name = "Keybox"
Keybox22.Size = UDim2.new(1, 0, 0, 40)
Keybox22.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Keybox22.BackgroundTransparency = 0.9
Keybox22.BorderSizePixel = 0
Keybox22.ZIndex = 3
Keybox22.LayoutOrder = 1
Keybox22.Parent = KeyFrame15

local UICorner23 = Instance.new("UICorner")
UICorner23.CornerRadius = UDim.new(0, 8)
UICorner23.Parent = Keybox22

local UIStroke24 = Instance.new("UIStroke")
UIStroke24.Color = Color3.fromRGB(255, 255, 255)
UIStroke24.Thickness = 1
UIStroke24.Transparency = 0.75
UIStroke24.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
UIStroke24.Parent = Keybox22

local UIPadding25 = Instance.new("UIPadding")
UIPadding25.PaddingTop = UDim.new(0, 0)
UIPadding25.PaddingBottom = UDim.new(0, 0)
UIPadding25.PaddingLeft = UDim.new(0, 12)
UIPadding25.PaddingRight = UDim.new(0, 12)
UIPadding25.Parent = Keybox22

local TextBox26 = Instance.new("TextBox")
TextBox26.Name = "KeyInput"
TextBox26.Size = UDim2.new(1, 0, 1, 0)
TextBox26.BackgroundTransparency = 1
TextBox26.BorderSizePixel = 0
TextBox26.Text = ""
TextBox26.TextColor3 = Color3.fromRGB(255, 255, 255)
TextBox26.TextSize = 13
TextBox26.Font = Enum.Font.Gotham
TextBox26.ZIndex = 4
TextBox26.ClearTextOnFocus = false
TextBox26.MultiLine = false
TextBox26.PlaceholderText = "Enter your license key..."
TextBox26.PlaceholderColor3 = Color3.fromRGB(120, 120, 120)
TextBox26.TextXAlignment = Enum.TextXAlignment.Left
TextBox26.TextYAlignment = Enum.TextYAlignment.Center
TextBox26.Parent = Keybox22

TextBox26.Focused:Connect(function()
	tween(Keybox22, {BackgroundTransparency = 0.85}, 0.2)
	tween(UIStroke24, {Transparency = 0.4, Thickness = 1.5}, 0.2)
end)
TextBox26.FocusLost:Connect(function()
	tween(Keybox22, {BackgroundTransparency = 0.9}, 0.2)
	tween(UIStroke24, {Transparency = 0.75, Thickness = 1}, 0.2)
end)

local RedeemFrame28 = Instance.new("Frame")
RedeemFrame28.Name = "RedeemFrame"
RedeemFrame28.Size = UDim2.new(1, 0, 0, 0)
RedeemFrame28.BackgroundTransparency = 1
RedeemFrame28.BorderSizePixel = 0
RedeemFrame28.AutomaticSize = Enum.AutomaticSize.Y
RedeemFrame28.ZIndex = 3
RedeemFrame28.LayoutOrder = 3
RedeemFrame28.Parent = Left6

local UIListLayout29 = Instance.new("UIListLayout")
UIListLayout29.Padding = UDim.new(0, 10)
UIListLayout29.FillDirection = Enum.FillDirection.Vertical
UIListLayout29.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout29.VerticalAlignment = Enum.VerticalAlignment.Top
UIListLayout29.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout29.Parent = RedeemFrame28

local Button30 = Instance.new("Frame")
Button30.Name = "RedeemButton"
Button30.Size = UDim2.new(1, 0, 0, 38)
Button30.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Button30.BackgroundTransparency = 0.05
Button30.BorderSizePixel = 0
Button30.ZIndex = 3
Button30.LayoutOrder = 0
Button30.Parent = RedeemFrame28

local ButtonCorner = Instance.new("UICorner")
ButtonCorner.CornerRadius = UDim.new(0, 8)
ButtonCorner.Parent = Button30

local ButtonStroke = Instance.new("UIStroke")
ButtonStroke.Color = Color3.fromRGB(255, 255, 255)
ButtonStroke.Thickness = 1
ButtonStroke.Transparency = 0.3
ButtonStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
ButtonStroke.Parent = Button30

local Text33 = Instance.new("Frame")
Text33.Name = "ButtonTextContainer"
Text33.Size = UDim2.new(1, 0, 1, 0)
Text33.BackgroundTransparency = 1
Text33.BorderSizePixel = 0
Text33.ZIndex = 4
Text33.Parent = Button30

local UIListLayout34 = Instance.new("UIListLayout")
UIListLayout34.Padding = UDim.new(0, 6)
UIListLayout34.FillDirection = Enum.FillDirection.Horizontal
UIListLayout34.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout34.VerticalAlignment = Enum.VerticalAlignment.Center
UIListLayout34.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout34.Parent = Text33

local TextLabel35 = Instance.new("TextLabel")
TextLabel35.Name = "RedeemLabel"
TextLabel35.Size = UDim2.new(0, 0, 1, 0)
TextLabel35.BackgroundTransparency = 1
TextLabel35.BorderSizePixel = 0
TextLabel35.AutomaticSize = Enum.AutomaticSize.X
TextLabel35.ZIndex = 5
TextLabel35.Text = "Redeem Key"
TextLabel35.TextColor3 = Color3.fromRGB(0, 0, 0)
TextLabel35.TextSize = 12
TextLabel35.Font = Enum.Font.GothamBold
TextLabel35.TextTransparency = 0
TextLabel35.TextXAlignment = Enum.TextXAlignment.Center
TextLabel35.TextYAlignment = Enum.TextYAlignment.Center
TextLabel35.Parent = Text33

local Click37 = Instance.new("TextButton")
Click37.Name = "RedeemClick"
Click37.Size = UDim2.new(1, 0, 1, 0)
Click37.BackgroundTransparency = 1
Click37.BorderSizePixel = 0
Click37.Text = ""
Click37.ZIndex = 6
Click37.AutoButtonColor = false
Click37.Parent = Button30

Click37.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
		tween(Button30, {BackgroundTransparency = 0}, 0.15)
		tween(ButtonStroke, {Transparency = 0}, 0.15)
	end
end)
Click37.InputEnded:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
		tween(Button30, {BackgroundTransparency = 0.05}, 0.15)
		tween(ButtonStroke, {Transparency = 0.3}, 0.15)
	end
end)
Click37.MouseButton1Down:Connect(function(x, y)
	tween(Button30, {Size = UDim2.new(0.97, 0, 0, 36)}, 0.1)
	createRipple(Button30, x, y)
end)
Click37.MouseButton1Up:Connect(function()
	tween(Button30, {Size = UDim2.new(1, 0, 0, 38)}, 0.15, Enum.EasingStyle.Elastic, Enum.EasingDirection.Out)
end)

local TextLabel38 = Instance.new("TextLabel")
TextLabel38.Name = "DiscordLink"
TextLabel38.Size = UDim2.new(0, 0, 0, 0)
TextLabel38.BackgroundTransparency = 1
TextLabel38.BorderSizePixel = 0
TextLabel38.AutomaticSize = Enum.AutomaticSize.XY
TextLabel38.ZIndex = 3
TextLabel38.LayoutOrder = 2
TextLabel38.Text = "Need support? <font color='rgb(255, 255, 255)'>Join the Discord</font>"
TextLabel38.TextColor3 = Color3.fromRGB(255, 255, 255)
TextLabel38.TextSize = 11
TextLabel38.Font = Enum.Font.Gotham
TextLabel38.RichText = true
TextLabel38.TextTransparency = 0.5
TextLabel38.TextXAlignment = Enum.TextXAlignment.Center
TextLabel38.TextYAlignment = Enum.TextYAlignment.Center
TextLabel38.Parent = RedeemFrame28

local Click39 = Instance.new("TextButton")
Click39.Name = "DiscordClick"
Click39.Size = UDim2.new(1, 0, 1, 0)
Click39.BackgroundTransparency = 1
Click39.BorderSizePixel = 0
Click39.Text = ""
Click39.ZIndex = 4
Click39.AutoButtonColor = false
Click39.Parent = TextLabel38

Click39.MouseButton1Click:Connect(function()
	createRipple(TextLabel38)
	pcall(function() setclipboard(DISCORD_URL) end)
	TextLabel38.Text = "Discord link copied!"
	task.delay(2, function()
		TextLabel38.Text = "Need support? <font color='rgb(255, 255, 255)'>Join the Discord</font>"
	end)
end)
Click39.MouseEnter:Connect(function() tween(TextLabel38, {TextTransparency = 0.2}, 0.15) end)
Click39.MouseLeave:Connect(function() tween(TextLabel38, {TextTransparency = 0.5}, 0.15) end)

local Line40 = Instance.new("Frame")
Line40.Name = "Divider"
Line40.Size = UDim2.new(1, 0, 0, 1)
Line40.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Line40.BackgroundTransparency = 0.9
Line40.BorderSizePixel = 0
Line40.ZIndex = 3
Line40.LayoutOrder = 4
Line40.Parent = RedeemFrame28

local TabList41 = Instance.new("Frame")
TabList41.Name = "TabList"
TabList41.Size = UDim2.new(1, 0, 0, 32)
TabList41.BackgroundTransparency = 1
TabList41.BorderSizePixel = 0
TabList41.ZIndex = 3
TabList41.LayoutOrder = 4
TabList41.Parent = Left6

local UIListLayout42 = Instance.new("UIListLayout")
UIListLayout42.Padding = UDim.new(0, 8)
UIListLayout42.FillDirection = Enum.FillDirection.Horizontal
UIListLayout42.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout42.VerticalAlignment = Enum.VerticalAlignment.Center
UIListLayout42.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout42.Parent = TabList41

-- Sakura Hub distributes keys through Discord instead of ad-reward checkpoints.
local function createGetKeyTab(name, iconId, discordUrl)
	local tab = Instance.new("Frame")
	tab.Name = name .. "Tab"
	tab.Size = UDim2.new(0, 25, 0, 28)
	tab.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	tab.BackgroundTransparency = 0.1
	tab.BorderSizePixel = 0
	tab.AutomaticSize = Enum.AutomaticSize.X
	tab.ZIndex = 3
	tab.Parent = TabList41

	local content = Instance.new("Frame")
	content.Name = "TabContent"
	content.Size = UDim2.new(1, 0, 1, 0)
	content.BackgroundTransparency = 1
	content.BorderSizePixel = 0
	content.ZIndex = 4
	content.Parent = tab

	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 6)
	list.FillDirection = Enum.FillDirection.Horizontal
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.VerticalAlignment = Enum.VerticalAlignment.Center
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = content

	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, 0)
	pad.PaddingBottom = UDim.new(0, 0)
	pad.PaddingLeft = UDim.new(0, 10)
	pad.PaddingRight = UDim.new(0, 10)
	pad.Parent = content

	local icon = Instance.new("ImageLabel")
	icon.Name = "TabIcon"
	icon.Size = UDim2.new(0, 14, 0, 14)
	icon.BackgroundTransparency = 1
	icon.BorderSizePixel = 0
	icon.Image = iconId
	icon.ImageColor3 = Color3.fromRGB(0, 0, 0)
	icon.ImageTransparency = 0
	icon.ScaleType = Enum.ScaleType.Fit
	icon.ZIndex = 5
	icon.Parent = content

	local label = Instance.new("TextLabel")
	label.Name = "TabText"
	label.Size = UDim2.new(0, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.BorderSizePixel = 0
	label.AutomaticSize = Enum.AutomaticSize.X
	label.ZIndex = 5
	label.Text = name
	label.TextColor3 = Color3.fromRGB(0, 0, 0)
	label.TextSize = 11
	label.Font = Enum.Font.GothamBold
	label.TextTransparency = 0
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.Parent = content

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(1, 0)
	corner.Parent = tab

	local click = Instance.new("TextButton")
	click.Name = "TabClick"
	click.Size = UDim2.new(1, 0, 1, 0)
	click.BackgroundTransparency = 1
	click.BorderSizePixel = 0
	click.Text = ""
	click.ZIndex = 6
	click.AutoButtonColor = false
	click.Parent = tab

	click.MouseEnter:Connect(function() tween(tab, {BackgroundTransparency = 0}, 0.15) end)
	click.MouseLeave:Connect(function() tween(tab, {BackgroundTransparency = 0.1}, 0.15) end)
	click.MouseButton1Down:Connect(function(x, y)
		tween(tab, {Size = UDim2.new(0, math.max(25, tab.AbsoluteSize.X - 4), 0, 26)}, 0.1)
		createRipple(tab, x, y)
	end)
	click.MouseButton1Up:Connect(function()
		tween(tab, {Size = UDim2.new(0, 25, 0, 28)}, 0.15, Enum.EasingStyle.Elastic, Enum.EasingDirection.Out)
	end)

	click.MouseButton1Click:Connect(function()
		pcall(function() setclipboard(discordUrl) end)
		showNotification("Discord invite copied! Join to get your key.", false)
	end)

	return tab, click
end

local GetKeyTab43, GetKeyClick43 = createGetKeyTab("Get Key on Discord", "rbxassetid://13868333926", DISCORD_URL)

local Explain70 = Instance.new("Frame")
Explain70.Name = "Instructions"
Explain70.Size = UDim2.new(1, 0, 0, 0)
Explain70.BackgroundTransparency = 1
Explain70.BorderSizePixel = 0
Explain70.AutomaticSize = Enum.AutomaticSize.Y
Explain70.ZIndex = 3
Explain70.LayoutOrder = 4
Explain70.Parent = Left6

local UIListLayout71 = Instance.new("UIListLayout")
UIListLayout71.Padding = UDim.new(0, 10)
UIListLayout71.FillDirection = Enum.FillDirection.Vertical
UIListLayout71.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout71.VerticalAlignment = Enum.VerticalAlignment.Center
UIListLayout71.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout71.Parent = Explain70

local Line72 = Instance.new("Frame")
Line72.Name = "TopDivider"
Line72.Size = UDim2.new(1, 0, 0, 1)
Line72.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
Line72.BackgroundTransparency = 0.9
Line72.BorderSizePixel = 0
Line72.ZIndex = 3
Line72.LayoutOrder = -1
Line72.Parent = Explain70

local function createStep(number, text, order)
	local frame = Instance.new("Frame")
	frame.Name = "Step" .. number
	frame.Size = UDim2.new(1, 0, 0, 0)
	frame.BackgroundTransparency = 1
	frame.BorderSizePixel = 0
	frame.AutomaticSize = Enum.AutomaticSize.Y
	frame.ZIndex = 3
	frame.LayoutOrder = order
	frame.Parent = Explain70

	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 10)
	list.FillDirection = Enum.FillDirection.Horizontal
	list.HorizontalAlignment = Enum.HorizontalAlignment.Left
	list.VerticalAlignment = Enum.VerticalAlignment.Center
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = frame

	local numBg = Instance.new("Frame")
	numBg.Name = "StepNumBg"
	numBg.Size = UDim2.new(0, 20, 0, 20)
	numBg.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	numBg.BackgroundTransparency = 0.85
	numBg.BorderSizePixel = 0
	numBg.ZIndex = 4
	numBg.Parent = frame

	local numCorner = Instance.new("UICorner")
	numCorner.CornerRadius = UDim.new(1, 0)
	numCorner.Parent = numBg

	local numLabel = Instance.new("TextLabel")
	numLabel.Name = "StepNum"
	numLabel.Size = UDim2.new(1, 0, 1, 0)
	numLabel.BackgroundTransparency = 1
	numLabel.BorderSizePixel = 0
	numLabel.AutomaticSize = Enum.AutomaticSize.X
	numLabel.ZIndex = 5
	numLabel.Text = tostring(number)
	numLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	numLabel.TextSize = 12
	numLabel.Font = Enum.Font.GothamBold
	numLabel.TextTransparency = 0
	numLabel.TextXAlignment = Enum.TextXAlignment.Center
	numLabel.TextYAlignment = Enum.TextYAlignment.Center
	numLabel.Parent = numBg

	local desc = Instance.new("TextLabel")
	desc.Name = "StepDesc"
	desc.Size = UDim2.new(0.85, 0, 0, 0)
	desc.BackgroundTransparency = 1
	desc.BorderSizePixel = 0
	desc.AutomaticSize = Enum.AutomaticSize.Y
	desc.ZIndex = 4
	desc.Text = text
	desc.TextColor3 = Color3.fromRGB(255, 255, 255)
	desc.TextSize = 11
	desc.Font = Enum.Font.Gotham
	desc.TextWrapped = true
	desc.TextTransparency = 0.35
	desc.TextXAlignment = Enum.TextXAlignment.Left
	desc.TextYAlignment = Enum.TextYAlignment.Center
	desc.Parent = frame
end

createStep(1, "Click \"Get Key on Discord\" above to join our server", 0)
createStep(2, "Follow the instructions in the server to generate your key", 1)
createStep(3, "Copy and paste your key here to redeem!", 2)

local Notify91 = Instance.new("Frame")
Notify91.Name = "NotifyArea"
Notify91.Size = UDim2.new(0, 100, 0, 30)
Notify91.Position = UDim2.new(0.5, 0, 1, -8)
Notify91.AnchorPoint = Vector2.new(0.5, 1)
Notify91.BackgroundTransparency = 1
Notify91.BorderSizePixel = 0
Notify91.ZIndex = 10
Notify91.Parent = Background2

local UIListLayout92 = Instance.new("UIListLayout")
UIListLayout92.Padding = UDim.new(0, 6)
UIListLayout92.FillDirection = Enum.FillDirection.Vertical
UIListLayout92.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout92.VerticalAlignment = Enum.VerticalAlignment.Bottom
UIListLayout92.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout92.Parent = Notify91

function showNotification(message, isError)
	-- Log all messages to console instead of showing UI notifications
	if isError then
		warn("[SakuraHub] " .. message)
	else
		print("[SakuraHub] " .. message)
	end
end

Background2.Size = UDim2.new(0, 380, 0, 0)
Background2.BackgroundTransparency = 1

tween(Backdrop, {BackgroundTransparency = 0.35}, 0.4)

task.delay(0.1, function()
	Background2.BackgroundTransparency = 0.05
	tween(Background2, {Size = UDim2.new(0, 380, 0, Left6.AbsoluteSize.Y + 36)}, 0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
end)

local slideElements = {TItleIcon9, adsframe13, KeyFrame15, RedeemFrame28, TabList41, Explain70}
for i, elem in ipairs(slideElements) do
	elem.Position = UDim2.new(-0.1, 0, elem.Position.Y.Scale, elem.Position.Y.Offset)
	task.delay(0.2 + (i * 0.06), function()
		tween(elem, {Position = UDim2.new(0, 0, elem.Position.Y.Scale, elem.Position.Y.Offset)}, 0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
		for _, child in ipairs(elem:GetDescendants()) do
			if child:IsA("TextLabel") or child:IsA("TextBox") then
				local orig = child.TextTransparency
				child.TextTransparency = 1
				tween(child, {TextTransparency = orig}, 0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
			end
		end
		if elem:IsA("TextLabel") or elem:IsA("TextBox") then
			local orig = elem.TextTransparency
			elem.TextTransparency = 1
			tween(elem, {TextTransparency = orig}, 0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
		end
	end)
end

for _, elem in ipairs(slideElements) do
	for _, child in ipairs(elem:GetDescendants()) do
		if child:IsA("ImageLabel") and child.Name ~= "Shadow" then
			local orig = child.ImageTransparency
			child.ImageTransparency = 1
			task.delay(0.3, function()
				tween(child, {ImageTransparency = orig}, 0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
			end)
		end
	end
end

local dragHandles = {TItleIcon9, adsframe13}
local dragging = false
local dragInput = nil
local dragStart = nil
local startPos = nil
local dragEndConnection = nil

local function clampToScreen(proposedPos)
	local camera = workspace.CurrentCamera
	if not camera then return proposedPos end
	local viewport = camera.ViewportSize
	local half = Background2.AbsoluteSize / 2
	local absX = proposedPos.X.Scale * viewport.X + proposedPos.X.Offset
	local absY = proposedPos.Y.Scale * viewport.Y + proposedPos.Y.Offset
	absX = math.clamp(absX, half.X, math.max(half.X, viewport.X - half.X))
	absY = math.clamp(absY, half.Y, math.max(half.Y, viewport.Y - half.Y))
	return UDim2.new(0, absX, 0, absY)
end

local function updateDrag(input)
	local delta = input.Position - dragStart
	local proposedPos = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
	Background2.Position = clampToScreen(proposedPos)
end

local function beginDrag(input)
	dragging = true
	dragStart = input.Position
	startPos = Background2.Position
	Background2.ZIndex = 100
	if dragEndConnection then dragEndConnection:Disconnect() end
	dragEndConnection = input.Changed:Connect(function()
		if input.UserInputState == Enum.UserInputState.End then
			dragging = false
			Background2.ZIndex = 2
			dragEndConnection:Disconnect()
			dragEndConnection = nil
		end
	end)
end

for _, handle in ipairs(dragHandles) do
	handle.Active = true
	handle.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
			beginDrag(input)
		end
	end)
	handle.InputChanged:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
			dragInput = input
		end
	end)
end

UserInputService.InputChanged:Connect(function(input)
	if dragging and input == dragInput then
		updateDrag(input)
	end
end)

local isRedeeming = false

local function redeemKey()
	if isRedeeming then return end
	local key = TextBox26.Text:gsub("^%s+", ""):gsub("%s+$", "")
	if not key or #key == 0 then
		showNotification("Please enter a key!", true)
		return
	end

	isRedeeming = true
	TextLabel35.Text = "Checking..."
	tween(Button30, {BackgroundTransparency = 0.2}, 0.1)
	showNotification("Validating key with FlowAuth...", false)

	task.spawn(function()
		local ok, err = executeFlowAuth(key)
		if ok then
			saveKey(key)
			showNotification("Key accepted! Launching Sakura Hub...", false)
			task.delay(1.5, function()
				getgenv().SakuraHubKeySystemLoaded = false
				pcall(function() ScreenGui1:Destroy() end)
			end)
		else
			TextLabel35.Text = "Redeem Key"
			tween(Button30, {BackgroundTransparency = 0.05}, 0.1)
			local msg = tostring(err or ""):lower()
			if msg:find("linked to another device") or msg:find("hwid mismatch") or msg:find("device mismatch") then
				showNotification("Key is linked to another device. Reset your key or use a new one.", true)
			elseif msg:find("expired") or msg:find("expir") or msg:find("inactive") then
				showNotification("Your key has expired!", true)
			elseif msg:find("invalid") or msg:find("not found") or msg:find("wrong") or msg:find("unauthorized") then
				showNotification("Invalid key!", true)
			elseif msg:find("blacklist") or msg:find("banned") then
				showNotification("This key has been blacklisted!", true)
			elseif msg:find("rate") or msg:find("cooldown") or msg:find("too many") then
				showNotification("Rate limited -- please wait a moment.", true)
			else
				showNotification("Validation failed: " .. tostring(err), true)
			end
			isRedeeming = false
		end
	end)
end

-- Activated works for mouse, touch, and gamepad. Do not call :Fire() on an event.
Click37.Activated:Connect(redeemKey)
TextBox26.FocusLost:Connect(function(enterPressed)
	if enterPressed then
		redeemKey()
	end
end)

local Click21 = Instance.new("TextButton")
Click21.Name = "CopyKeyClick"
Click21.Size = UDim2.new(1, 0, 1, 0)
Click21.BackgroundTransparency = 1
Click21.BorderSizePixel = 0
Click21.Text = ""
Click21.ZIndex = 5
Click21.AutoButtonColor = false
Click21.Parent = Frame18

Click21.MouseButton1Click:Connect(function()
	createRipple(Frame18)
	pcall(function() setclipboard(TextBox26.Text) end)
	showNotification("Key copied!", false)
end)
Click21.MouseEnter:Connect(function() tween(Frame18, {BackgroundTransparency = 0.4}, 0.15) end)
Click21.MouseLeave:Connect(function() tween(Frame18, {BackgroundTransparency = 0.6}, 0.15) end)

if startupError == "EXPIRED" then
	task.delay(0.8, function()
		showNotification("Your saved key has expired!", true)
	end)
elseif startupError == "HWID" then
	task.delay(0.8, function()
		warn("[SakuraHub] Key is linked to another device. Please reset your key or use a new one.")
	end)
elseif startupError == "INVALID" then
	task.delay(0.8, function()
		showNotification("Saved key was invalid -- removed.", true)
	end)
end

print("[SakuraHub] Key System loaded -- FlowAuth integrated!")
