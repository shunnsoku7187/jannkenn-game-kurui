import React, { useEffect, useRef } from 'react';
import { CHEAT_SKILLS } from '../utils/constants';
import { TestResult } from '../utils/skillTestRunner';

interface DebugModeScreenProps {
  onRunSkillTest: (skillName: string) => Promise<void>;
  testResults: { [skill: string]: TestResult[] };
  isTesting: boolean;
  onBackToStart: () => void; // onSwitchToInitialMode を onBackToStart に変更
  debugLogMessages: string[]; // New: デバッグログメッセージのプロパティを追加
}

export const DebugModeScreen: React.FC<DebugModeScreenProps> = ({
  onRunSkillTest,
  testResults,
  isTesting,
  onBackToStart, // onSwitchToInitialMode を onBackToStart に変更
  debugLogMessages, // New: デバッグログメッセージを受け取る
}) => {
  const availableSkills = Object.keys(CHEAT_SKILLS);
  const [selectedSkill, setSelectedSkill] = React.useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null); // New: ログエリアの参照

  useEffect(() => {
    // New: ログエリアの自動スクロール
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [debugLogMessages]);

  const handleRunTest = async (skillName: string) => {
    setSelectedSkill(skillName);
    await onRunSkillTest(skillName);
  };

  const getOverallStatus = (skillName: string) => {
    const results = testResults[skillName];
    if (!results || results.length === 0) return '';
    const allPassed = results.every(r => r.passed);
    return allPassed ? '全てのテストが合格しました！' : '一部のテストが失敗しました。';
  };

  const getOverallStatusClass = (skillName: string) => {
    const results = testResults[skillName];
    if (!results || results.length === 0) return '';
    const allPassed = results.every(r => r.passed);
    return allPassed ? 'bg-green-700 text-white' : 'bg-red-700 text-white';
  };

  return (
    <div className="text-center space-y-6 w-full max-w-3xl mx-auto p-4">
      <h3 className="text-medium font-bold text-blue-400">デバッグモード: イカサマテスト</h3>
      <p className="text-small text-gray-400">テストしたいイカサマスキルを選択してください。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableSkills.map((skill) => (
          <button
            key={skill}
            onClick={() => handleRunTest(skill)}
            disabled={isTesting}
            className={`flex items-center justify-between p-4 rounded-lg shadow-md transition
                        ${isTesting ? 'opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}
                        ${selectedSkill === skill ? 'ring-2 ring-blue-300' : ''}`}
          >
            <span className="text-medium font-bold">{skill}</span>
            <span className="px-3 py-1 bg-blue-800 rounded-md text-small">テスト実行</span>
          </button>
        ))}
      </div>

      {isTesting && (
        <div className="flex items-center justify-center space-x-2 text-white text-medium">
          <div className="spinner-small"></div>
          <span>テスト実行中...</span>
        </div>
      )}

      {selectedSkill && testResults[selectedSkill] && (
        <div className="test-results-container bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 text-left space-y-4">
          <h4 className="text-medium font-bold text-blue-300 mb-2">
            「{selectedSkill}」スキル テスト結果
          </h4>
          <div className={`p-3 rounded-md font-bold text-medium ${getOverallStatusClass(selectedSkill)}`}>
            {getOverallStatus(selectedSkill)}
          </div>
          <ul className="space-y-2">
            {testResults[selectedSkill].map((result, index) => (
              <li key={index} className="flex items-start text-small text-gray-200">
                <span className={`mr-2 ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
                  {result.passed ? '✅' : '❌'}
                </span>
                <div>
                  <span className="font-semibold">{result.name}:</span> {result.message}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New: Debug Log Area */}
      <div className="flex-grow bg-gray-900 p-4 rounded-xl shadow-xl overflow-y-auto h-72 border border-gray-700 text-left">
        <h3 className="text-medium font-semibold mb-2 border-b border-gray-700 pb-1 text-white">デバッグログ</h3>
        <pre id="debug-message-log" ref={logRef} className="text-small whitespace-pre-wrap text-gray-300">
          {debugLogMessages.join('\n')}
        </pre>
      </div>

      <button
        onClick={onBackToStart} // onSwitchToInitialMode を onBackToStart に変更
        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition mt-6"
        disabled={isTesting}
      >
        戻る
      </button>
    </div>
  );
};