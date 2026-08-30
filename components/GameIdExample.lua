local Games = {
    ["2753915549"] = 'loadstring(game:HttpGet("https://your-url/script.lua"))()'
}

local Script = Games[tostring(game.GameId)]

if Script then
    loadstring(Script)()
end