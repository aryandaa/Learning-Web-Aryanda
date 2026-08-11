from sympy import gcdex, gcd

p = 26513
q = 32321

u, v, g = gcdex(p, q)
print(f"u = {u}\nv = {v}")
print (f"{p * u + q * v} hasilnya akan sama dengan {gcd(p, q)}")