/**
 * "We moved" notice for people still running the old script.
 *
 * /api/loader serves this before the real script on every normal request.
 * It shows a small window in-game explaining that VoidHub moved to AquaHub,
 * with one action:
 *   - Join Discord: copies the invite, then leaves the game so the player
 *     can go and join. The window says this up front, before they press.
 * Nothing happens until the player presses the button.
 */

const AQUAHUB_INVITE = 'https://discord.gg/Vcz9zHhTjp'

/** Keep only characters that are safe inside a Lua string literal. */
function luaSafe(s: string) {
  return s.replace(/[^A-Za-z0-9:/._\-?=&%~#+]/g, '')
}

export function buildMigrationScript(siteUrl = 'https://www.voidon.top'): string {
  const invite = luaSafe(AQUAHUB_INVITE)
  const site = luaSafe(siteUrl)
  return `-- VoidHub moved to AquaHub
local INVITE = "${invite}"
local SITE = "${site}"

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer

local function pickParent()
  local ok, ui = pcall(function() return gethui and gethui() end)
  if ok and ui then return ui end
  ok, ui = pcall(function() return game:GetService("CoreGui") end)
  if ok and ui then return ui end
  return player:WaitForChild("PlayerGui")
end

local function copy(text)
  local fn = setclipboard or toclipboard or (syn and syn.write_clipboard) or (Clipboard and Clipboard.set)
  if not fn then return false end
  local ok, result = pcall(fn, text)
  return ok and result ~= false
end

pcall(function()
  local old = pickParent():FindFirstChild("AquaHubMoved")
  if old then old:Destroy() end
end)

local gui = Instance.new("ScreenGui")
gui.Name = "AquaHubMoved"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 999
gui.Parent = pickParent()

local dim = Instance.new("Frame")
dim.Size = UDim2.fromScale(1, 1)
dim.BackgroundColor3 = Color3.new(0, 0, 0)
dim.BackgroundTransparency = 0.45
dim.BorderSizePixel = 0
dim.Parent = gui

local card = Instance.new("Frame")
card.AnchorPoint = Vector2.new(0.5, 0.5)
card.Position = UDim2.fromScale(0.5, 0.5)
card.Size = UDim2.new(0.9, 0, 0, 320)
card.BackgroundColor3 = Color3.fromRGB(8, 17, 36)
card.BorderSizePixel = 0
card.Parent = gui
Instance.new("UICorner", card).CornerRadius = UDim.new(0, 18)
local stroke = Instance.new("UIStroke", card)
stroke.Color = Color3.fromRGB(47, 126, 255)
stroke.Thickness = 1.5
local limit = Instance.new("UISizeConstraint", card)
limit.MaxSize = Vector2.new(420, 320)
limit.MinSize = Vector2.new(260, 320)

local function label(text, y, h, size, color, font)
  local l = Instance.new("TextLabel")
  l.BackgroundTransparency = 1
  l.Position = UDim2.new(0, 24, 0, y)
  l.Size = UDim2.new(1, -48, 0, h)
  l.Font = font or Enum.Font.Gotham
  l.Text = text
  l.TextSize = size
  l.TextColor3 = color
  l.TextWrapped = true
  l.TextXAlignment = Enum.TextXAlignment.Left
  l.TextYAlignment = Enum.TextYAlignment.Top
  l.Parent = card
  return l
end

label("AQUAHUB", 22, 16, 13, Color3.fromRGB(104, 169, 255), Enum.Font.GothamBold)
label("We moved to AquaHub", 42, 32, 24, Color3.new(1, 1, 1), Enum.Font.GothamBold)
local body = label(
  "VoidHub has moved to AquaHub. Join the new AquaHub Discord for updates. Press below to copy the invite and leave this game so you can join.",
  84, 112, 15, Color3.fromRGB(197, 210, 231)
)

local function button(text)
  local b = Instance.new("TextButton")
  b.AutoButtonColor = false
  b.AnchorPoint = Vector2.new(0, 1)
  b.Position = UDim2.new(0, 24, 1, -24)
  b.Size = UDim2.new(1, -48, 0, 48)
  b.BackgroundColor3 = Color3.fromRGB(39, 117, 255)
  b.TextColor3 = Color3.new(1, 1, 1)
  b.Font = Enum.Font.GothamBold
  b.TextSize = 15
  b.Text = text
  b.BorderSizePixel = 0
  b.Parent = card
  Instance.new("UICorner", b).CornerRadius = UDim.new(0, 12)
  return b
end

local join = button("Join Discord")

local link = Instance.new("TextBox")
link.Visible = false
link.ClearTextOnFocus = false
link.TextEditable = false
link.BackgroundColor3 = Color3.fromRGB(15, 31, 58)
link.BorderSizePixel = 0
link.Position = UDim2.new(0, 24, 0, 200)
link.Size = UDim2.new(1, -48, 0, 34)
link.Font = Enum.Font.Code
link.TextSize = 14
link.TextColor3 = Color3.new(1, 1, 1)
link.Text = INVITE
link.Parent = card
Instance.new("UICorner", link).CornerRadius = UDim.new(0, 10)

local busy = false
join.MouseButton1Click:Connect(function()
  if busy then return end
  busy = true
  if copy(INVITE) then
    join.Text = "Copied! Leaving..."
    body.Text = "Invite copied: " .. INVITE .. "\\nPaste it into Discord to join."
    task.wait(1.6)
    player:Kick("VoidHub moved to AquaHub. The Discord invite was copied to your clipboard: " .. INVITE .. " (site: " .. SITE .. ")")
  else
    -- No clipboard support in this executor: show the link instead of leaving.
    busy = false
    join.Text = "Join Discord"
    body.Text = "Your executor can't copy for you. Type this invite into Discord (or your browser) to join:"
    link.Visible = true
  end
end)

card.Size = UDim2.new(0.9, 0, 0, 300)
TweenService:Create(card, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = UDim2.new(0.9, 0, 0, 320) }):Play()
`
}
