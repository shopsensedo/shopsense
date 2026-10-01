/**
 * ShopSense Cross-Platform Design Tokens
 * 
 * Protech dark-first theme — lime on near-black, Poppins/Inter typography,
 * Dark-first light/dark mappings, 100% compatible with Flutter ThemeData.
 */

export const DESIGN_TOKENS = {
  colors: {
    light: {
      primary: '#0C0C0C',         // Noir
      primaryDark: '#262626',     // Graphite
      primaryLight: '#F2F4D6',    // Lime Tint
      accent: '#B9C006',          // Lime (Protech CTA)
      accentLight: '#F7F8E4',     // Soft Lime
      success: '#16A34A',         // Emerald Green (Price Drop)
      successLight: '#F0FDF4',
      warning: '#F59E0B',         // Amber
      warningLight: '#FFFBEB',
      error: '#DC2626',           // Red
      errorLight: '#FEF2F2',
      background: '#F5F5F5',      // Bone
      surface: '#FFFFFF',         // White Card
      surfaceSubtle: '#EFEFEA',   // Pearl
      border: '#E5E5E1',          // Stone
      borderSubtle: '#EFEFEA',
      textPrimary: '#0C0C0C',     // Void
      textSecondary: '#5F5F60',   // Smoke
      textMuted: '#9C9C9D',       // Fog
    },
    dark: {
      primary: '#B9C006',
      primaryDark: '#A3AE05',
      primaryLight: '#2B2F0C',
      accent: '#B9C006',
      accentLight: '#2B2F0C',
      success: '#22C55E',
      successLight: '#052E16',
      warning: '#FBBF24',
      warningLight: '#451A03',
      error: '#EF4444',
      errorLight: '#450A0A',
      background: '#0C0C0C',
      surface: '#1A1A1A',
      surfaceSubtle: '#262626',
      border: '#333333',
      borderSubtle: '#262626',
      textPrimary: '#F5F5F5',
      textSecondary: '#9C9C9D',
      textMuted: '#5F5F60',
    },
    platforms: {
      daraz: '#F85606',      // Daraz Orange
      telemart: '#0284C7',   // Telemart Sky Blue
      bagallery: '#E11D48',  // Bagallery Rose
      priceoye: '#8A9204',   // PriceOye Olive
      elo: '#D97706',        // Export Leftovers Amber
      shophive: '#059669',   // Shophive Emerald
      gulahmed: '#B91C1C',   // Gul Ahmed Maroon
    }
  },
  typography: {
    fontFamilies: {
      heading: "'Poppins', sans-serif",
      body: "'Inter', sans-serif",
      numbers: "'Inter', sans-serif", // Tabular numbers
    },
    scale: {
      display: { size: '32px', lineHeight: '40px', weight: '700' },
      h1: { size: '28px', lineHeight: '36px', weight: '700' },
      h2: { size: '22px', lineHeight: '30px', weight: '600' },
      h3: { size: '18px', lineHeight: '26px', weight: '600' },
      body: { size: '16px', lineHeight: '24px', weight: '400' },
      bodyMedium: { size: '16px', lineHeight: '24px', weight: '500' },
      bodySmall: { size: '14px', lineHeight: '20px', weight: '400' },
      bodySmallMedium: { size: '14px', lineHeight: '20px', weight: '500' },
      caption: { size: '12px', lineHeight: '16px', weight: '500' },
      captionSmall: { size: '10px', lineHeight: '14px', weight: '600' },
    }
  },
  spacing: {
    xs: 4,    // 4px
    sm: 8,    // 8px (base unit)
    md: 12,   // 12px
    lg: 16,   // 16px (card inner padding)
    xl: 24,   // 24px (section inner gap)
    xxl: 32,  // 32px (container margin)
    xxxl: 48, // 48px
    huge: 64, // 64px
  },
  radius: {
    sm: 8,     // small 8px
    md: 12,    // medium 12px
    lg: 16,    // large 16px
    pill: 9999,// pill 999px
  },
  elevation: {
    card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
    raised: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
    modal: '0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
  },
  motion: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  }
};

export interface TokenTableItem {
  name: string;
  category: 'Color' | 'Typography' | 'Spacing' | 'Border Radius' | 'Elevation' | 'Motion';
  webValue: string;
  flutterValue: string;
  description: string;
}

export const DESIGN_TOKENS_TABLE: TokenTableItem[] = [
  // Colors
  { name: 'color.primary', category: 'Color', webValue: '#0C0C0C', flutterValue: 'Color(0xFF0C0C0C)', description: 'Primary noir (light) / lime (dark), active tab' },
  { name: 'color.primaryDark', category: 'Color', webValue: '#262626', flutterValue: 'Color(0xFF262626)', description: 'Button pressed / dark variant' },
  { name: 'color.primaryLight', category: 'Color', webValue: '#F2F4D6', flutterValue: 'Color(0xFFF2F4D6)', description: 'Primary chip / badge background' },
  { name: 'color.accent', category: 'Color', webValue: '#B9C006', flutterValue: 'Color(0xFFB9C006)', description: 'High-intent CTA lime, camera icon' },
  { name: 'color.success', category: 'Color', webValue: '#16A34A', flutterValue: 'Color(0xFF16A34A)', description: 'Price drop indicator, in stock' },
  { name: 'color.warning', category: 'Color', webValue: '#F59E0B', flutterValue: 'Color(0xFFF59E0B)', description: 'Low stock warning' },
  { name: 'color.error', category: 'Color', webValue: '#DC2626', flutterValue: 'Color(0xFFDC2626)', description: 'Out of stock, invalid file' },
  { name: 'color.background', category: 'Color', webValue: '#F5F5F5', flutterValue: 'Color(0xFFF5F5F5)', description: 'Screen canvas background' },
  { name: 'color.surface', category: 'Color', webValue: '#FFFFFF', flutterValue: 'Color(0xFFFFFFFF)', description: 'Card and modal background' },
  { name: 'color.border', category: 'Color', webValue: '#E5E5E1', flutterValue: 'Color(0xFFE5E5E1)', description: 'Hairline card dividers' },
  { name: 'color.textPrimary', category: 'Color', webValue: '#0C0C0C', flutterValue: 'Color(0xFF0C0C0C)', description: 'High contrast readable text' },
  { name: 'color.textSecondary', category: 'Color', webValue: '#5F5F60', flutterValue: 'Color(0xFF5F5F60)', description: 'Muted descriptions, subtitles' },
  
  // Platform Brand Colors
  { name: 'platform.daraz', category: 'Color', webValue: '#F85606', flutterValue: 'Color(0xFFF85606)', description: 'Daraz marketplace identity' },
  { name: 'platform.telemart', category: 'Color', webValue: '#0284C7', flutterValue: 'Color(0xFF0284C7)', description: 'Telemart tech store' },
  { name: 'platform.bagallery', category: 'Color', webValue: '#E11D48', flutterValue: 'Color(0xFFE11D48)', description: 'Bagallery fashion & beauty' },
  { name: 'platform.priceoye', category: 'Color', webValue: '#8A9204', flutterValue: 'Color(0xFF8A9204)', description: 'PriceOye electronics' },
  { name: 'platform.elo', category: 'Color', webValue: '#D97706', flutterValue: 'Color(0xFFD97706)', description: 'Export Leftovers apparel' },

  // Typography
  { name: 'type.display', category: 'Typography', webValue: "Poppins 32px / 40px Bold", flutterValue: "GoogleFonts.poppins(fontSize: 32, height: 1.25, fontWeight: FontWeight.w700)", description: 'Hero landing heading' },
  { name: 'type.h1', category: 'Typography', webValue: "Poppins 28px / 36px Bold", flutterValue: "GoogleFonts.poppins(fontSize: 28, height: 1.28, fontWeight: FontWeight.w700)", description: 'Screen headers' },
  { name: 'type.h2', category: 'Typography', webValue: "Poppins 22px / 30px SemiBold", flutterValue: "GoogleFonts.poppins(fontSize: 22, height: 1.36, fontWeight: FontWeight.w600)", description: 'Section headers, card title' },
  { name: 'type.h3', category: 'Typography', webValue: "Poppins 18px / 26px SemiBold", flutterValue: "GoogleFonts.poppins(fontSize: 18, height: 1.44, fontWeight: FontWeight.w600)", description: 'Subsections, modal titles' },
  { name: 'type.body', category: 'Typography', webValue: "Inter 16px / 24px Regular", flutterValue: "GoogleFonts.inter(fontSize: 16, height: 1.5, fontWeight: FontWeight.w400)", description: 'Default readable text' },
  { name: 'type.bodySmall', category: 'Typography', webValue: "Inter 14px / 20px Regular", flutterValue: "GoogleFonts.inter(fontSize: 14, height: 1.42, fontWeight: FontWeight.w400)", description: 'Card descriptions, meta' },
  { name: 'type.caption', category: 'Typography', webValue: "Inter 12px / 16px Medium", flutterValue: "GoogleFonts.inter(fontSize: 12, height: 1.33, fontWeight: FontWeight.w500)", description: 'Tags, chips, footnotes' },

  // Spacing (8pt)
  { name: 'spacing.xs', category: 'Spacing', webValue: '4px', flutterValue: '4.0', description: 'Tight icon gap' },
  { name: 'spacing.sm', category: 'Spacing', webValue: '8px', flutterValue: '8.0', description: 'Base 8pt grid' },
  { name: 'spacing.md', category: 'Spacing', webValue: '12px', flutterValue: '12.0', description: 'Input internal padding' },
  { name: 'spacing.lg', category: 'Spacing', webValue: '16px', flutterValue: '16.0', description: 'Card standard padding' },
  { name: 'spacing.xl', category: 'Spacing', webValue: '24px', flutterValue: '24.0', description: 'Section separator gap' },
  { name: 'spacing.xxl', category: 'Spacing', webValue: '32px', flutterValue: '32.0', description: 'Page margin' },

  // Radii
  { name: 'radius.small', category: 'Border Radius', webValue: '8px', flutterValue: 'BorderRadius.circular(8.0)', description: 'Buttons, badges, tags' },
  { name: 'radius.medium', category: 'Border Radius', webValue: '12px', flutterValue: 'BorderRadius.circular(12.0)', description: 'Input fields, small cards' },
  { name: 'radius.large', category: 'Border Radius', webValue: '16px', flutterValue: 'BorderRadius.circular(16.0)', description: 'Product cards, modal sheets' },
  { name: 'radius.pill', category: 'Border Radius', webValue: '9999px', flutterValue: 'BorderRadius.circular(999.0)', description: 'Pill chips, avatar circle' },

  // Elevation
  { name: 'elevation.card', category: 'Elevation', webValue: 'shadow-sm (1-3px blur)', flutterValue: 'BoxShadow(color: Color(0x0F0F172A), blurRadius: 3, offset: Offset(0, 1))', description: 'Resting cards' },
  { name: 'elevation.raised', category: 'Elevation', webValue: 'shadow-md (4-6px blur)', flutterValue: 'BoxShadow(color: Color(0x140F172A), blurRadius: 6, offset: Offset(0, 4))', description: 'Hover / floating bottom nav' },
  { name: 'elevation.modal', category: 'Elevation', webValue: 'shadow-xl (20-25px blur)', flutterValue: 'BoxShadow(color: Color(0x1F0F172A), blurRadius: 25, offset: Offset(0, 20))', description: 'Bottom sheets & modals' },

  // Motion
  { name: 'motion.fast', category: 'Motion', webValue: '150ms ease-out', flutterValue: 'Duration(milliseconds: 150), curve: Curves.easeOut', description: 'Button click, hover tap' },
  { name: 'motion.normal', category: 'Motion', webValue: '200ms ease-out', flutterValue: 'Duration(milliseconds: 200), curve: Curves.easeOut', description: 'Card reveal, filter switch' },
];

export const FLUTTER_THEME_DATA_CODE = `// Flutter ThemeData Configuration for ShopSense
// Generated for 100% pixel-parity with ShopSense Web

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ShopSenseTheme {
  // Brand Color Palette
  static const Color primary = Color(0xFF4F46E5);
  static const Color primaryDark = Color(0xFF3730A3);
  static const Color primaryLight = Color(0xFFEEF2FF);
  static const Color accent = Color(0xFFF97316);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFDC2626);
  
  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);

  // Store Brand Colors
  static const Color darazOrange = Color(0xFFF85606);
  static const Color telemartBlue = Color(0xFF0284C7);
  static const Color bagalleryRose = Color(0xFFE11D48);
  static const Color priceoyePurple = Color(0xFF7C3AED);
  static const Color eloAmber = Color(0xFFD97706);

  // 8pt Spacing Scale
  static const double space4 = 4.0;
  static const double space8 = 8.0;
  static const double space12 = 12.0;
  static const double space16 = 16.0;
  static const double space24 = 24.0;
  static const double space32 = 32.0;

  // Radii
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusPill = 999.0;

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: backgroundLight,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: primary,
        onPrimary: Colors.white,
        primaryContainer: primaryLight,
        onPrimaryContainer: primaryDark,
        secondary: accent,
        onSecondary: Colors.white,
        error: error,
        onError: Colors.white,
        surface: surfaceLight,
        onSurface: textPrimaryLight,
      ),
      fontFamily: GoogleFonts.inter().fontFamily,
      textTheme: TextTheme(
        displayLarge: GoogleFonts.poppins(fontSize: 32, height: 1.25, fontWeight: FontWeight.w700, color: textPrimaryLight),
        headlineLarge: GoogleFonts.poppins(fontSize: 28, height: 1.28, fontWeight: FontWeight.w700, color: textPrimaryLight),
        headlineMedium: GoogleFonts.poppins(fontSize: 22, height: 1.36, fontWeight: FontWeight.w600, color: textPrimaryLight),
        headlineSmall: GoogleFonts.poppins(fontSize: 18, height: 1.44, fontWeight: FontWeight.w600, color: textPrimaryLight),
        bodyLarge: GoogleFonts.inter(fontSize: 16, height: 1.5, fontWeight: FontWeight.w400, color: textPrimaryLight),
        bodyMedium: GoogleFonts.inter(fontSize: 14, height: 1.42, fontWeight: FontWeight.w400, color: textSecondaryLight),
        labelSmall: GoogleFonts.inter(fontSize: 12, height: 1.33, fontWeight: FontWeight.w600, color: textSecondaryLight),
      ),
      cardTheme: CardTheme(
        color: surfaceLight,
        elevation: 1.0,
        shadowColor: const Color(0x0F0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          side: const BorderSide(color: borderLight, width: 1.0),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSmall)),
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceLight,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surfaceLight,
        selectedItemColor: primary,
        unselectedItemColor: textSecondaryLight,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
    );
  }
}
`;
