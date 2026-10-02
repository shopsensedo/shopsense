import 'package:flutter/material.dart';

/// Design tokens mirroring the web app.
class AppTheme {
  static const voidBlack = Color(0xFF0C0C0C);
  static const bone = Color(0xFFF4F1EA);
  static const lime = Color(0xFFB9C006);
  static const smoke = Color(0xFF6B7280);
  static const fog = Color(0xFF9CA3AF);

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: lime).copyWith(
          primary: voidBlack,
          secondary: lime,
          surface: bone,
        ),
        scaffoldBackgroundColor: bone,
        appBarTheme: const AppBarTheme(
          backgroundColor: voidBlack,
          foregroundColor: Colors.white,
        ),
      );
}
