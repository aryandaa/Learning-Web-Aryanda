from pwn import xor

txt = "label"
key = 13

hasilXor = xor(key, txt).decode()
print (f"cyrpto{{{hasilXor}}}")