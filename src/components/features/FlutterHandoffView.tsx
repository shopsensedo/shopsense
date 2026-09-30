import React, { useState } from 'react';
import { Copy, Check, Code, Palette, Type, LayoutGrid, Smartphone, Laptop } from 'lucide-react';
import { DESIGN_TOKENS_TABLE, FLUTTER_THEME_DATA_CODE } from '../../styles/tokens';
import { useToast } from '../ui/Toast';

export const FlutterHandoffView: React.FC = () => {
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Color', 'Typography', 'Spacing', 'Border Radius', 'Elevation', 'Motion'];

  const filteredTokens = selectedCategory === 'All'
    ? DESIGN_TOKENS_TABLE
    : DESIGN_TOKENS_TABLE.filter((t) => t.category === selectedCategory);

  const copyFlutterCode = () => {
    navigator.clipboard.writeText(FLUTTER_THEME_DATA_CODE);
    setCopiedCode(true);
    showToast('Flutter ThemeData code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-6 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#A5B4FC] text-xs font-semibold mb-2">
              <Code className="w-3.5 h-3.5" />
              <span>Flutter ThemeData & Design System Handoff</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
              Cross-Platform Parity Specification
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl">
              Strict 1:1 parity between ShopSense Web and Flutter Mobile. Every color token, typography scale, 8pt spacing step, and corner radius maps directly to Flutter ThemeData.
            </p>
          </div>

          <button
            type="button"
            onClick={copyFlutterCode}
            className="h-11 px-5 rounded-xl bg-[#4F46E5] hover:bg-[#3730A3] dark:bg-[#6366F1] dark:hover:bg-[#4F46E5] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'Copied Dart Code!' : 'Copy Flutter ThemeData'}</span>
          </button>
        </div>
      </div>

      {/* Web vs Mobile Interaction Equivalence Guide */}
      <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] p-6 mb-6 shadow-xs">
        <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 font-heading flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#F97316]" />
          <span>Web vs. Flutter Mobile Interaction Equivalence Table</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#283548]">
            <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Web Drag-and-Drop & Paste</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-2">HTML5 dragover/drop + window.onpaste (Ctrl+V) from screenshot clipboard.</p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold text-[#16A34A] dark:text-[#4ADE80]">
              Flutter Mobile Equivalent: <span className="text-slate-700 dark:text-slate-300 font-normal">image_picker package for Camera / Gallery modal sheet + receive_sharing_intent for Instagram OS Share Sheet.</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#283548]">
            <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Desktop Hover Micro-Interactions</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-2">CSS :hover states, card elevation lift (translateY -2px), button hover colors.</p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold text-[#16A34A] dark:text-[#4ADE80]">
              Flutter Mobile Equivalent: <span className="text-slate-700 dark:text-slate-300 font-normal">InkWell splash + active scale [0.98] with HapticFeedback.lightImpact() on touch tap.</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#283548]">
            <div className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Desktop Sticky Filter Sidebar</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-2">260px wide left sidebar column with range sliders and platform chips.</p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold text-[#16A34A] dark:text-[#4ADE80]">
              Flutter Mobile Equivalent: <span className="text-slate-700 dark:text-slate-300 font-normal">showModalBottomSheet with rounded-t-3xl and drag handle handle bar.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Design Tokens Table */}
      <div className="bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200 dark:border-[#1E293B] overflow-hidden shadow-xs mb-6">
        <div className="p-5 border-b border-slate-200 dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] font-heading">
              Complete Design Tokens Table
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">All token definitions with web value and Flutter ThemeData equivalent</p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E293B]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1E293B] border-b border-slate-200 dark:border-[#283548] text-slate-700 dark:text-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Token Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Web (Tailwind/CSS)</th>
                <th className="py-3 px-4">Flutter (ThemeData / Dart)</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
              {filteredTokens.map((token, idx) => (
                <tr key={idx} className="hover:bg-slate-50/75 dark:hover:bg-[#1E293B]/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#4F46E5] dark:text-[#818CF8] select-all">
                    {token.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                    {token.category}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {token.category === 'Color' && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                          style={{ backgroundColor: token.webValue }}
                        />
                      )}
                      <span className="font-mono text-slate-800 dark:text-slate-200">{token.webValue}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400 font-semibold select-all">
                    {token.flutterValue}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs">
                    {token.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Flutter ThemeData Code Snippet Block */}
      <div className="bg-[#0F172A] text-slate-200 rounded-2xl p-5 overflow-hidden border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono text-slate-400 ml-2">lib/theme/shop_sense_theme.dart</span>
          </div>

          <button
            type="button"
            onClick={copyFlutterCode}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Code</span>
          </button>
        </div>

        <pre className="font-mono text-xs overflow-x-auto max-h-96 text-slate-300 leading-relaxed">
          <code>{FLUTTER_THEME_DATA_CODE}</code>
        </pre>
      </div>
    </div>
  );
};
