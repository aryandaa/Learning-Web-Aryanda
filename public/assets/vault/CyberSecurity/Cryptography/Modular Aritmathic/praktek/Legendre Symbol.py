def Legendre (a, p):
    p1 = p -1
    p1 //= 2
    a1 = pow(a, p1, p)

    p2 = p1 + 1
    if a1 == 1:
        return f"{a} adalah quadratic residue dari mod {p}"
    elif a1 == p1:
        return f"{a} adalah quadratic non-residue dari mod {p}"
    else:
        return f"{a} ≡ 0 (mod {p})"

print(Legendre(7, 2))