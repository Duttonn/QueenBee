import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const RESTRICTED_COMMANDS = [
  'rm -rf /', ':(){ :|:& };:', 'dd if=/dev/zero', 'mkfs', 
  'chmod -R 777 /', 'wget http://malicious.site', 'curl | bash'
];

const RestrictedCommands = () => {

  return (

    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">

      <div className="flex items-start gap-3">

        <ShieldAlert className="text-amber-600 mt-0.5" size={18} />

        <div>

          <h3 className="text-sm font-bold text-amber-900">Restricted Operations</h3>

          <p className="text-xs text-amber-700 mt-1 mb-3">

            For security, the following commands and patterns are strictly blocked or require explicit confirmation.

          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

            {RESTRICTED_COMMANDS.map((cmd) => (

              <div key={cmd} className="flex items-center gap-2 bg-white/60 px-2 py-1.5 rounded border border-amber-100">

                <AlertTriangle size={12} className="text-amber-500" />

                <code className="text-[10px] font-mono text-amber-800">{cmd}</code>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  );

};



export default RestrictedCommands;
