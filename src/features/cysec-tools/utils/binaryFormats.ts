/**
 * Parser read-only untuk format biner: PE (Windows), ELF (Linux), Mach-O (macOS).
 * Tidak ada eksekusi/modifikasi — hanya menampilkan header & metadata.
 */

import { readAscii, u16, u32 } from './bytes';

// ---------------------------------------------------------------------------
// PE / Portable Executable
// ---------------------------------------------------------------------------

export interface PeImportDll {
  dll: string;
  functions: string[];
}

export interface PeSection {
  name: string;
  virtualSize: number;
  virtualAddress: number;
  rawSize: number;
  rawOffset: number;
  characteristics: string;
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export interface PeResult {
  valid: boolean;
  error?: string;
  dosHeader?: { e_lfanew: number };
  machine?: string;
  machineCode?: string;
  numberOfSections?: number;
  timeDateStamp?: string;
  characteristics?: string[];
  magic?: 'PE32' | 'PE32+';
  entryPointRva?: string;
  entryPointFileOffset?: string;
  imageBase?: string;
  sectionAlignment?: number;
  fileAlignment?: number;
  subsystem?: string;
  dllCharacteristic?: string[];
  sections: PeSection[];
  imports: PeImportDll[];
  dataDirectories?: { name: string; rva: string; size: string }[];
}

const MACHINES: Record<number, string> = {
  0x014c: 'i386', 0x0166: 'MIPS R4000', 0x01c0: 'ARM little-endian', 0x01c4: 'ARMv7',
  0x01f0: 'PowerPC', 0x0200: 'IA-64', 0x8664: 'x86-64', 0xaa64: 'ARM64', 0x5032: 'RISC-V 32', 0x5064: 'RISC-V 64',
};

const SUBSYSTEMS: Record<number, string> = {
  1: 'NATIVE', 2: 'WINDOWS_GUI', 3: 'WINDOWS_CUI', 5: 'OS2_CUI', 7: 'POSIX_CUI',
  9: 'WINDOWS_CE_GUI', 10: 'EFI_APPLICATION', 11: 'EFI_BOOT_SERVICE_DRIVER', 12: 'EFI_RUNTIME_DRIVER', 14: 'XBOX',
};

export function parsePe(bytes: Uint8Array): PeResult {
  const result: PeResult = { valid: false, sections: [], imports: [] };
  if (bytes.length < 0x40 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
    result.error = 'Bukan file PE (magic "MZ" tidak ditemukan).';
    return result;
  }
  const e_lfanew = u32(bytes, 0x3c);
  if (e_lfanew + 24 > bytes.length) {
    result.error = 'e_lfanew di luar file.';
    return result;
  }
  if (bytes[e_lfanew] !== 0x50 || bytes[e_lfanew + 1] !== 0x45) {
    result.error = 'PE signature "PE\\0\\0" tidak ditemukan.';
    return result;
  }
  result.valid = true;
  result.dosHeader = { e_lfanew };

  const coff = e_lfanew + 4;
  const machine = u16(bytes, coff);
  const nSections = u16(bytes, coff + 2);
  const ts = u32(bytes, coff + 4);
  const sizeOfOptional = u16(bytes, coff + 16);
  const characteristics = u16(bytes, coff + 18);
  result.machine = MACHINES[machine] ?? `0x${machine.toString(16)}`;
  result.machineCode = `0x${machine.toString(16)}`;
  result.numberOfSections = nSections;
  result.timeDateStamp = new Date(ts * 1000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  const charFlags: [number, string][] = [
    [0x0001, 'RELOCS_STRIPPED'], [0x0002, 'EXECUTABLE_IMAGE'], [0x0004, 'LINE_NUMS_STRIPPED'],
    [0x0008, 'LOCAL_SYMS_STRIPPED'], [0x0010, 'AGGRESSIVE_WS_TRIM'], [0x0020, 'LARGE_ADDRESS_AWARE'],
    [0x0040, '16BIT_MACHINE'], [0x0080, 'BYTES_REVERSED_LO'], [0x0100, '32BIT_MACHINE'],
    [0x0200, 'DEBUG_STRIPPED'], [0x0400, 'REMOVABLE_RUN_FROM_SWAP'], [0x0800, 'NET_RUN_FROM_SWAP'],
    [0x1000, 'SYSTEM'], [0x2000, 'DLL'], [0x4000, 'UP_SYSTEM_ONLY'], [0x8000, 'BYTES_REVERSED_HI'],
  ];
  result.characteristics = charFlags.filter(([m]) => characteristics & m).map(([, n]) => n);

  const opt = coff + 20;
  if (sizeOfOptional < 2 || opt + sizeOfOptional > bytes.length) {
    result.error = 'Optional header tidak tersedia.';
    return result;
  }
  const magic = u16(bytes, opt);
  if (magic === 0x10b) result.magic = 'PE32';
  else if (magic === 0x20b) result.magic = 'PE32+';
  else {
    result.error = `Magic optional header tidak dikenal: 0x${magic.toString(16)}`;
    return result;
  }
  const is64 = result.magic === 'PE32+';
  const entryRva = u32(bytes, opt + 16);
  result.entryPointRva = `0x${entryRva.toString(16)}`;
  const imageBase = is64 ? bytes[opt + 24] | (bytes[opt + 25] << 8) | (bytes[opt + 26] << 16) | (bytes[opt + 27] << 24) | (bytes[opt + 28] << 32) : u32(bytes, opt + 28);
  result.imageBase = `0x${imageBase.toString(16)}`;
  result.sectionAlignment = u32(bytes, opt + 32);
  result.fileAlignment = u32(bytes, opt + 36);
  const subsystem = u16(bytes, is64 ? opt + 68 : opt + 68);
  result.subsystem = SUBSYSTEMS[subsystem] ?? `0x${subsystem.toString(16)}`;
  const dllChar = u16(bytes, is64 ? opt + 70 : opt + 70);
  const dllFlags: [number, string][] = [
    [0x0020, 'HIGH_ENTROPY_VA'], [0x0040, 'DYNAMIC_BASE (ASLR)'], [0x0080, 'FORCE_INTEGRITY'],
    [0x0100, 'NX_COMPAT (DEP)'], [0x0400, 'NO_SEH'], [0x0800, 'NO_BIND'], [0x1000, 'APPCONTAINER'],
    [0x2000, 'WDM_DRIVER'], [0x4000, 'GUARD_CF'], [0x8000, 'TERMINAL_SERVER_AWARE'],
  ];
  result.dllCharacteristic = dllFlags.filter(([m]) => dllChar & m).map(([, n]) => n);
  const numRvaSizes = u32(bytes, is64 ? opt + 108 : opt + 92);
  const dirOffset = is64 ? opt + 112 : opt + 96;
  const dirNames = ['Export', 'Import', 'Resource', 'Exception', 'Certificate', 'Base Relocation', 'Debug', 'Architecture', 'Global Ptr', 'TLS', 'Load Config', 'Bound Import', 'IAT', 'Delay Import', 'CLR Runtime', 'Reserved'];
  result.dataDirectories = [];
  for (let i = 0; i < Math.min(numRvaSizes, 16); i++) {
    const rva = u32(bytes, dirOffset + i * 8);
    const size = u32(bytes, dirOffset + i * 8 + 4);
    result.dataDirectories.push({ name: dirNames[i] ?? `#${i}`, rva: `0x${rva.toString(16)}`, size: `0x${size.toString(16)}` });
  }

  // Sections
  const sectionsStart = coff + 20 + sizeOfOptional;
  for (let i = 0; i < nSections; i++) {
    const off = sectionsStart + i * 40;
    if (off + 40 > bytes.length) break;
    const name = readAscii(bytes, off, 8).replace(/\.+$/, '');
    const vsize = u32(bytes, off + 8);
    const vaddr = u32(bytes, off + 12);
    const rawSize = u32(bytes, off + 16);
    const rawOff = u32(bytes, off + 20);
    const chars = u32(bytes, off + 36);
    result.sections.push({
      name: name || `section_${i}`,
      virtualSize: vsize,
      virtualAddress: vaddr,
      rawSize,
      rawOffset: rawOff,
      characteristics: `0x${chars.toString(16)}`,
      readable: !(chars & 0x20000000),
      writable: !!(chars & 0x80000000),
      executable: !!(chars & 0x20000000),
    });
  }
  // Entry point file offset
  for (const s of result.sections) {
    const span = Math.max(s.virtualSize, s.rawSize);
    if (entryRva >= s.virtualAddress && entryRva < s.virtualAddress + span) {
      result.entryPointFileOffset = `0x${(s.rawOffset + (entryRva - s.virtualAddress)).toString(16)}`;
      break;
    }
  }

  // Imports
  const importDir = result.dataDirectories?.[1];
  if (importDir && importDir.rva !== '0x0' && importDir.size !== '0x0') {
    const rva = parseInt(importDir.rva, 16);
    const rvaToOff = (rva: number): number => {
      for (const s of result.sections) {
        const span = Math.max(s.virtualSize, s.rawSize);
        if (rva >= s.virtualAddress && rva < s.virtualAddress + span) {
          return s.rawOffset + (rva - s.virtualAddress);
        }
      }
      return -1;
    };
    let off = rvaToOff(rva);
    const is64Imp = is64;
    for (let d = 0; d < 200 && off >= 0 && off + 20 <= bytes.length; d++) {
      const oft = u32(bytes, off);
      const nameRva = u32(bytes, off + 12);
      const ft = u32(bytes, off + 16);
      if (oft === 0 && nameRva === 0 && ft === 0) break;
      const dllNameOff = rvaToOff(nameRva);
      const dll = dllNameOff >= 0 ? readAscii(bytes, dllNameOff, 80).split('\0')[0] : `?rva:${nameRva.toString(16)}`;
      const funcs: string[] = [];
      const thunkStart = rvaToOff(oft !== 0 ? oft : ft);
      if (thunkStart >= 0) {
        for (let t = 0; t < 5000; t++) {
          const pos = thunkStart + t * (is64Imp ? 8 : 4);
          if (pos + (is64Imp ? 8 : 4) > bytes.length) break;
          const thunk = is64Imp
            ? bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24) | (bytes[pos + 4] << 32)
            : u32(bytes, pos);
          if (thunk === 0) break;
          const ordinalFlag = is64Imp ? 0x8000000000000000 : 0x80000000;
          if (thunk & ordinalFlag) {
            funcs.push(`ordinal_${thunk & 0xffff}`);
          } else {
            const nameOff = rvaToOff((thunk as number) >>> 0);
            if (nameOff >= 0) {
              const fn = readAscii(bytes, nameOff + 2, 100).split('\0')[0];
              funcs.push(fn || `addr_0x${thunk.toString(16)}`);
            } else {
              funcs.push(`0x${thunk.toString(16)}`);
            }
          }
        }
      }
      result.imports.push({ dll, functions: funcs.slice(0, 200) });
      off += 20;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// ELF
// ---------------------------------------------------------------------------

export interface ElfSegment {
  type: string;
  offset: string;
  vaddr: string;
  filesz: string;
  memsz: string;
  flags: string;
  align: string;
}

export interface ElfSectionHeader {
  name: string;
  type: string;
  flags: string;
  addr: string;
  offset: string;
  size: string;
  link: number;
}

export interface ElfResult {
  valid: boolean;
  error?: string;
  className?: string;
  endian?: string;
  osabi?: string;
  type?: string;
  machine?: string;
  entryPoint?: string;
  elfHeaderSize?: number;
  segments: ElfSegment[];
  sections: ElfSectionHeader[];
  sectionNames?: string;
}

const ELF_MACHINES: Record<number, string> = {
  0x03: 'i386', 0x08: 'MIPS', 0x14: 'PowerPC', 0x16: 's390', 0x28: 'ARM', 0x2a: 'SuperH',
  0x32: 'IA-64', 0x3e: 'x86-64', 0xb7: 'AArch64', 0xf3: 'RISC-V',
};

const ELF_TYPES: Record<number, string> = {
  0: 'NONE', 1: 'REL (relocatable)', 2: 'EXEC (executable)', 3: 'DYN (shared object)', 4: 'CORE',
};

const ELF_OSABI: Record<number, string> = {
  0: 'System V', 1: 'HP-UX', 2: 'NetBSD', 3: 'Linux', 6: 'Solaris', 9: 'FreeBSD', 12: 'OpenBSD',
};

const ELF_PT: Record<number, string> = {
  0: 'NULL', 1: 'LOAD', 2: 'DYNAMIC', 3: 'INTERP', 4: 'NOTE', 5: 'SHLIB', 6: 'PHDR', 7: 'TLS',
  0x6474e550: 'GNU_STACK', 0x6474e551: 'GNU_RELRO', 0x6474e552: 'GNU_PROPERTY',
};

const ELF_SHT: Record<number, string> = {
  0: 'NULL', 1: 'PROGBITS', 2: 'SYMTAB', 3: 'STRTAB', 4: 'RELA', 5: 'HASH', 6: 'DYNAMIC',
  7: 'NOTE', 8: 'NOBITS', 9: 'REL', 10: 'SHLIB', 11: 'DYNSYM', 14: 'INIT_ARRAY', 15: 'FINI_ARRAY',
  16: 'PREINIT_ARRAY', 17: 'GROUP', 18: 'SYMTAB_SHNDX', 19: 'RELR',
};

export function parseElf(bytes: Uint8Array): ElfResult {
  const result: ElfResult = { valid: false, segments: [], sections: [] };
  if (bytes.length < 52 || bytes[0] !== 0x7f || bytes[1] !== 0x45 || bytes[2] !== 0x4c || bytes[3] !== 0x46) {
    result.error = 'Bukan file ELF (magic \\x7fELF tidak ditemukan).';
    return result;
  }
  result.valid = true;
  const is64 = bytes[4] === 2;
  const be = bytes[5] === 2;
  result.className = is64 ? 'ELF64' : 'ELF32';
  result.endian = be ? 'Big-endian' : 'Little-endian';
  result.osabi = ELF_OSABI[bytes[7]] ?? `0x${bytes[7].toString(16)}`;

  const rdU16 = (o: number) => u16(bytes, o, !be);
  const rdU32 = (o: number) => u32(bytes, o, !be);
  const rdAddr = (o: number) => {
    if (!is64) return `0x${rdU32(o).toString(16)}`;
    let v = 0n;
    for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(bytes[o + i]);
    return `0x${v.toString(16)}`;
  };

  result.type = ELF_TYPES[rdU16(16)] ?? `0x${rdU16(16).toString(16)}`;
  result.machine = ELF_MACHINES[rdU16(18)] ?? `0x${rdU16(18).toString(16)}`;
  result.entryPoint = rdAddr(24);
  result.elfHeaderSize = rdU16(52);

  const phoff = is64 ? rdU64(bytes, 32, be) : rdU32(28);
  const phentsize = rdU16(54);
  const phnum = rdU16(56);
  for (let i = 0; i < phnum; i++) {
    const off = Number(phoff) + i * phentsize;
    if (off + phentsize > bytes.length) break;
    const type = rdU32(off);
    const typeName = ELF_PT[type] ?? `0x${type.toString(16)}`;
    let o: string, va: string, fs: string, ms: string, fl: string, al: string;
    if (is64) {
      o = `0x${rdU64(bytes, off + 8, be).toString(16)}`;
      va = rdAddr(off + 16);
      fs = `0x${rdU64(bytes, off + 32, be).toString(16)}`;
      ms = `0x${rdU64(bytes, off + 40, be).toString(16)}`;
      fl = `0x${rdU32(off + 4).toString(16)}`;
      al = `0x${rdU64(bytes, off + 48, be).toString(16)}`;
    } else {
      o = `0x${rdU32(off + 4).toString(16)}`;
      va = `0x${rdU32(off + 8).toString(16)}`;
      fs = `0x${rdU32(off + 16).toString(16)}`;
      ms = `0x${rdU32(off + 20).toString(16)}`;
      fl = `0x${rdU32(off + 24).toString(16)}`;
      al = `0x${rdU32(off + 28).toString(16)}`;
    }
    result.segments.push({ type: typeName, offset: o, vaddr: va, filesz: fs, memsz: ms, flags: fl, align: al });
  }

  const shoff = is64 ? rdU64(bytes, 40, be) : rdU32(32);
  const shentsize = rdU16(58);
  const shnum = rdU16(60);
  const shstrndx = rdU16(62);
  let strtabOff = -1;
  let strtabSize = 0;
  if (shstrndx < shnum && shstrndx !== 0xffff) {
    const off = Number(shoff) + shstrndx * shentsize;
    if (off + shentsize <= bytes.length) {
      strtabOff = is64 ? Number(rdU64(bytes, off + 24, be)) : rdU32(off + 16);
      strtabSize = is64 ? Number(rdU64(bytes, off + 32, be)) : rdU32(off + 20);
    }
  }
  const secName = (nameOff: number): string => {
    if (strtabOff < 0 || nameOff >= strtabSize) return '';
    return readAscii(bytes, strtabOff + nameOff, 64).split('\0')[0];
  };
  for (let i = 0; i < shnum; i++) {
    const off = Number(shoff) + i * shentsize;
    if (off + shentsize > bytes.length) break;
    const nameOff = rdU32(off);
    const type = rdU32(off + 4);
    let addr: string, so: string, sz: string, link: number;
    if (is64) {
      addr = `0x${rdU64(bytes, off + 16, be).toString(16)}`;
      so = `0x${rdU64(bytes, off + 24, be).toString(16)}`;
      sz = `0x${rdU64(bytes, off + 32, be).toString(16)}`;
      link = rdU32(off + 40);
    } else {
      addr = `0x${rdU32(off + 12).toString(16)}`;
      so = `0x${rdU32(off + 16).toString(16)}`;
      sz = `0x${rdU32(off + 20).toString(16)}`;
      link = rdU32(off + 24);
    }
    result.sections.push({
      name: secName(nameOff),
      type: ELF_SHT[type] ?? `0x${type.toString(16)}`,
      flags: `0x${rdU32(off + 8).toString(16)}`,
      addr,
      offset: so,
      size: sz,
      link,
    });
  }
  result.sectionNames = strtabOff >= 0 ? `string table @ 0x${strtabOff.toString(16)}` : undefined;
  return result;
}

function rdU64(b: Uint8Array, off: number, be: boolean): bigint {
  let v = 0n;
  if (be) {
    for (let i = 0; i < 8; i++) v = (v << 8n) | BigInt(b[off + i]);
  } else {
    for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(b[off + i]);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Mach-O (dasar, 64-bit)
// ---------------------------------------------------------------------------

export interface MachOResult {
  valid: boolean;
  error?: string;
  cputype?: string;
  cpusubtype?: string;
  filetype?: string;
  ncmds?: number;
  sizeofcmds?: number;
  flags?: string[];
  arch?: string;
}

const MACHO_CPUTYPE: Record<number, string> = {
  7: 'x86', 0x01000007: 'x86_64', 12: 'ARM', 0x0100000c: 'ARM64', 18: 'PowerPC', 0x01000012: 'PowerPC64',
};

const MACHO_FILETYPE: Record<number, string> = {
  1: 'MH_OBJECT', 2: 'MH_EXECUTE', 3: 'MH_FVMLIB', 4: 'MH_CORE', 5: 'MH_PRELOAD',
  6: 'MH_DYLIB', 7: 'MH_DYLINKER', 8: 'MH_BUNDLE', 9: 'MH_DYLIB_STUB', 10: 'MH_DSYM',
};

const MACHO_FLAGS: [number, string][] = [
  [0x1, 'NOUNDEFS'], [0x2, 'INCRLINK'], [0x4, 'DYLDLINK'], [0x8, 'BINDATLOAD'],
  [0x10, 'PREBOUND'], [0x20, 'SPLIT_SEGS'], [0x40, 'LAZY_INIT'], [0x80, 'TWOLEVEL'],
  [0x100, 'FORCE_FLAT'], [0x200, 'NOMULTIDEFS'], [0x400, 'NOFIXPREBINDING'], [0x800, 'PREBINDABLE'],
  [0x1000, 'ALLMODSBOUND'], [0x2000, 'SUBSECTIONS_VIA_SYMBOLS'], [0x4000, 'CANONICAL'],
  [0x8000, 'WEAK_DEFINES'], [0x10000, 'BINDS_TO_WEAK'], [0x20000, 'ALLOW_STACK_EXECUTION'],
  [0x40000, 'ROOT_SAFE'], [0x80000, 'SETUID_SAFE'], [0x100000, 'NO_REEXPORTED_DYLIBS'],
  [0x200000, 'PIE'], [0x400000, 'DEAD_STRIPPABLE_DYLIB'], [0x800000, 'HAS_TLV_DESCRIPTORS'],
  [0x1000000, 'NO_HEAP_EXECUTION'], [0x2000000, 'APP_EXTENSION_SAFE'],
];

export function parseMacho(bytes: Uint8Array): MachOResult {
  const result: MachOResult = { valid: false };
  if (bytes.length < 32) {
    result.error = 'File terlalu pendek untuk Mach-O.';
    return result;
  }
  const magic = u32(bytes, 0);
  let is64 = false;
  let be = false;
  if (magic === 0xfeedfacf) is64 = true;
  else if (magic === 0xfeedface) is64 = false;
  else if (magic === 0xcffaedfe) {
    is64 = true;
    be = true;
  } else if (magic === 0xcefaedfe) {
    is64 = false;
    be = true;
  } else {
    result.error = `Magic tidak dikenal: 0x${magic.toString(16)} — bukan Mach-O.`;
    return result;
  }
  result.valid = true;
  result.arch = is64 ? '64-bit' : '32-bit';
  const rd = (o: number) => u32(bytes, o, !be);
  const cputype = rd(4);
  const cpusubtype = rd(8);
  const filetype = rd(12);
  const ncmds = rd(16);
  const sizeofcmds = rd(20);
  const flags = rd(24);
  result.cputype = MACHO_CPUTYPE[cputype] ?? `0x${cputype.toString(16)}`;
  result.cpusubtype = `0x${cpusubtype.toString(16)}`;
  result.filetype = MACHO_FILETYPE[filetype] ?? `0x${filetype.toString(16)}`;
  result.ncmds = ncmds;
  result.sizeofcmds = sizeofcmds;
  result.flags = MACHO_FLAGS.filter(([m]) => flags & m).map(([, n]) => n);
  return result;
}
