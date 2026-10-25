import { describe, expect, it } from 'vitest';
import {
  applyCsvMapping,
  decodeStatement,
  detectCsvMapping,
  detectDelimiter,
  importKeys,
  maskAccountRef,
  parseCsvDate,
  parseOfx,
  splitCsv,
} from './statementImport';

/* Échantillons construits à la main sur le modèle des exports des banques (aucune donnée réelle). */

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
ENCODING:USASCII

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>EUR
<BANKACCTFROM><BANKID>30004<ACCTID>00012345678<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261020<TRNAMT>-42.90<FITID>A1<NAME>CB CARREFOUR 18/10<MEMO>PARIS</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261001120000[+1:CET]<TRNAMT>2150.00<FITID>A2<NAME>VIR SALAIRE OCTOBRE</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>pas une date<TRNAMT>-1.00<FITID>A3<NAME>ILLISIBLE</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>1834.56<DTASOF>20261024</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const OFX_XML = `<?xml version="1.0" encoding="UTF-8"?><?OFX OFXHEADER="200" VERSION="220"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><CURDEF>EUR</CURDEF>
<CCACCTFROM><ACCTID>4970XXXXXXXX1234</ACCTID></CCACCTFROM>
<BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261015</DTPOSTED><TRNAMT>-8.50</TRNAMT><FITID>X9</FITID><NAME>Boulangerie &amp; Café</NAME></STMTTRN></BANKTRANLIST>
<LEDGERBAL><BALAMT>-120.00</BALAMT><DTASOF>20261024</DTASOF></LEDGERBAL>
</CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

describe('OFX', () => {
  it('lit un OFX 1 (SGML) : opérations, solde, devise, compte ; rejette la ligne illisible', () => {
    const s = parseOfx(OFX_SGML);
    expect(s.currency).toBe('EUR');
    expect(s.accountRef).toBe('00012345678');
    expect(s.balance).toEqual({ cents: 183456, date: '2026-10-24' });
    expect(s.transactions).toEqual([
      { date: '2026-10-20', label: 'CB CARREFOUR 18/10 — PARIS', amountCents: -4290, bankId: 'A1' },
      { date: '2026-10-01', label: 'VIR SALAIRE OCTOBRE', amountCents: 215000, bankId: 'A2' },
    ]);
    expect(s.rejected).toEqual([3]);
  });

  it('lit un OFX 2 (XML) de carte, avec entités', () => {
    const s = parseOfx(OFX_XML);
    expect(s.transactions[0]).toMatchObject({ label: 'Boulangerie & Café', amountCents: -850 });
    expect(s.balance).toEqual({ cents: -12000, date: '2026-10-24' });
    expect(maskAccountRef(s.accountRef)).toBe('••1234');
  });
});

describe('CSV des banques françaises', () => {
  it('format type Crédit Agricole : lignes d’infos, puis débit / crédit séparés', () => {
    const text = `Compte de dépôt n° 12345678901;
Solde au 24/10/2026 1 234,56 €;

Date;Libellé;Débit euros;Crédit euros;
20/10/2026;"PRLV SEPA EDF
Facture 10/2026";65,30;;
19/10/2026;VIREMENT MAMAN;;150,00;
`;
    const rows = splitCsv(text, detectDelimiter(text));
    const mapping = detectCsvMapping(rows);
    expect(mapping).toMatchObject({ header: 2, date: 0, label: 1, debit: 2, credit: 3, amount: null });
    const s = applyCsvMapping(rows, mapping);
    expect(s.transactions).toEqual([
      { date: '2026-10-20', label: 'PRLV SEPA EDF Facture 10/2026', amountCents: -6530 },
      { date: '2026-10-19', label: 'VIREMENT MAMAN', amountCents: 15000 },
    ]);
    expect(s.rejected).toEqual([]);
  });

  it('format type BNP Paribas / Hello bank : la catégorie n’est pas prise pour le libellé', () => {
    const text = `Date operation;Categorie operation;Sous Categorie operation;Libelle operation;Montant operation
24/10/2026;Alimentation;Supermarché;CARTE X1234 MONOPRIX;-23,45
`;
    const rows = splitCsv(text, ';');
    const mapping = detectCsvMapping(rows);
    expect(mapping).toMatchObject({ header: 0, date: 0, label: 3, amount: 4 });
    expect(applyCsvMapping(rows, mapping).transactions[0]).toEqual({
      date: '2026-10-24',
      label: 'CARTE X1234 MONOPRIX',
      amountCents: -2345,
    });
  });

  it('format type BoursoBank : solde de compte lu', () => {
    const text = `dateOp;dateVal;label;category;categoryParent;supplierFound;amount;comment;accountNum;accountLabel;accountbalance
2026-10-22;2026-10-22;"CARTE 21/10/26 SNCF";Transports;Transports;sncf;-45,00;;0001;BoursoBank;1 980,10
`;
    const rows = splitCsv(text, ';');
    const mapping = detectCsvMapping(rows);
    expect(mapping).toMatchObject({ date: 0, label: 2, amount: 6, balance: 10 });
    const s = applyCsvMapping(rows, mapping);
    expect(s.transactions[0].amountCents).toBe(-4500);
    expect(s.balance).toEqual({ cents: 198010, date: '2026-10-22' });
  });

  it('format type Revolut : virgule comme séparateur, point décimal, date avec heure', () => {
    const text = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-10-20 14:03:11,2026-10-21 09:00:00,Uber,-12.50,0.00,EUR,COMPLETED,310.40
TOPUP,Current,2026-10-19 08:00:00,2026-10-19 08:00:01,Top-up,100.00,0.00,EUR,COMPLETED,322.90
`;
    const rows = splitCsv(text, detectDelimiter(text));
    const mapping = detectCsvMapping(rows);
    expect(mapping).toMatchObject({ date: 2, label: 4, amount: 5, balance: 9 });
    const s = applyCsvMapping(rows, mapping);
    expect(s.transactions.map((t) => t.amountCents)).toEqual([-1250, 10000]);
    expect(s.balance).toEqual({ cents: 31040, date: '2026-10-20' });
  });

  it('format sans en-tête (type LCL) : colonnes devinées d’après les valeurs', () => {
    const text = `25/10/2026;-12,50;Carte;;CB CARREFOUR CITY PARIS;
24/10/2026;1200,00;Virement;;VIR SEPA SALAIRE;
`;
    const rows = splitCsv(text, ';');
    const mapping = detectCsvMapping(rows);
    expect(mapping).toMatchObject({ header: null, date: 0, amount: 1, label: 4 });
    expect(applyCsvMapping(rows, mapping).transactions).toHaveLength(2);
  });

  it('dates : jour/mois par défaut, mois/jour détecté, années sur 2 chiffres', () => {
    expect(parseCsvDate('05/10/26', 'dmy')).toBe('2026-10-05');
    expect(parseCsvDate('10/25/2026', 'mdy')).toBe('2026-10-25');
    expect(parseCsvDate('31/02/2026', 'dmy')).toBeNull();
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['10/25/2026', 'Coffee', '-3.20'],
    ];
    expect(detectCsvMapping(rows).dateOrder).toBe('mdy');
  });

  it('fichier Windows-1252 (accents) décodé correctement', () => {
    const bytes = new Uint8Array([0x4c, 0x69, 0x62, 0x65, 0x6c, 0x6c, 0xe9]); // « Libellé » en Windows-1252
    expect(decodeStatement(bytes)).toBe('Libellé');
    expect(decodeStatement(new TextEncoder().encode('﻿Débit'))).toBe('Débit');
  });
});

describe('doublons', () => {
  it('deux opérations identiques le même jour restent deux ; réimporter donne les mêmes clés', () => {
    const t = [
      { date: '2026-10-20', label: 'CAFÉ', amountCents: -250 },
      { date: '2026-10-20', label: 'café', amountCents: -250 },
      { date: '2026-10-21', label: 'X', amountCents: -1, bankId: 'F1' },
    ];
    const keys = importKeys(t);
    expect(new Set(keys).size).toBe(3);
    expect(importKeys(t)).toEqual(keys);
    expect(keys[2]).toBe('fitid:F1');
  });
});
