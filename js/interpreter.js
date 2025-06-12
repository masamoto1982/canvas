const interpreter = (() => {
 let dataStack = [];
 const environment = {
   variables: {},
   functions: {}
 };

 const pop = () => {
   if (dataStack.length === 0) throw new Error("Stack underflow: cannot pop from an empty stack.");
   const val = dataStack.pop();
   console.log(`[DEBUG] Stack POP:`, val);
   return val;
 };

 const push = (val) => {
   console.log(`[DEBUG] Stack PUSH:`, val);
   dataStack.push(val);
 }
 
 const peek = () => {
   if (dataStack.length === 0) throw new Error("Stack underflow: cannot peek into an empty stack.");
   return dataStack[dataStack.length - 1];
 };

 const logStackState = (msg) => {
   console.log(`[DEBUG] ${msg}`, `[${dataStack.map(v => formatValue(v, true)).join(', ')}]`);
 }

 const executeTokens = (tokens, localEnv = {}) => {
   console.group(`[DEBUG] Executing tokens:`, tokens.map(t=>`"${t.value}"`));
   logStackState("Initial Stack State:");

   for (let i = 0; i < tokens.length; i++) {
     const token = tokens[i];
     console.log(`--- [DEBUG] Processing token [${i}]: "${token.value}" (${token.color}) ---`);
     
     // 空白文字は単純に無視する
     if (token.type === Types.WHITESPACE) {
       console.log(`[DEBUG] Ignoring whitespace: "${token.value}"`);
       continue;
     }

     // Handle values by pushing them onto the stack
     if (token.type === Types.NUMBER) {
       push(token.value.includes('/') ?
         Fraction.fromString(token.value, true) :
         Fraction(parseFloat(token.value), 1, false)
       );
     } else if (token.type === Types.BOOLEAN) {
       if (token.value === 'TRUE') push(true);
       else if (token.value === 'FALSE') push(false);
       else throw new Error(`Invalid boolean literal: '${token.value}'. Use 'TRUE' or 'FALSE'.`);
     } else if (token.type === Types.STRING) {
       // 文字列型は引用符なしでそのまま値として扱う
       push(token.value);
     } else if (token.type === Types.NIL) {
       push({ type: Types.NIL, value: null });
     }

     // Handle quotations: { ... }
     else if (token.value === '{' && token.color === 'red') {
       const quotation = [];
       let nesting = 1;
       i++; 
       while (i < tokens.length) {
         const innerToken = tokens[i];
         if (innerToken.value === '{' && innerToken.color === 'red') nesting++;
         if (innerToken.value === '}' && innerToken.color === 'red') nesting--;
         if (nesting === 0) break;
         quotation.push(innerToken);
         i++;
       }
       if (nesting !== 0) throw new Error("Syntax Error: Unmatched '{'.");
       push({ type: 'quotation', value: quotation });
     }

     // Handle symbols: operators, keywords, functions, variables
     else if (token.type === Types.SYMBOL) {
       const cmd = token.value;
       
       // 英数字のシンボルは大文字でなければならない
       if (/^[a-zA-Z0-9]+$/.test(cmd) && cmd !== cmd.toUpperCase()) {
         throw new Error(`Symbol names with alphanumeric characters must be uppercase: '${cmd}'. Use '${cmd.toUpperCase()}' instead.`);
       }

       // Basic Operators
       if (['+', '-', '*', '/'].includes(cmd)) {
         const b = pop();
         const a = pop();
         if (!Fraction.isValidNumber(a) || !Fraction.isValidNumber(b)) {
           throw new Error(`Type Error: Operator '${cmd}' requires Number type (green) operands.`);
         }
         switch (cmd) {
           case '+': push(a.add(b)); break;
           case '-': push(a.subtract(b)); break;
           case '*': push(a.multiply(b)); break;
           case '/':
             if (b.numerator === 0) throw new Error('Division by zero.');
             push(a.divide(b));
             break;
         }
       } else if (['>', '>=', '=='].includes(cmd)) {
         const b = pop();
         const a = pop();
         const aIsNil = a && a.type === Types.NIL;
         const bIsNil = b && b.type === Types.NIL;

         // Rule 1: Handle NIL comparisons
         if (aIsNil || bIsNil) {
           if (cmd === '==') {
             push(aIsNil && bIsNil);
           } else {
             throw new Error(`Type Error: Comparison operator '${cmd}' is not supported for NIL type.`);
           }
         }
         // Rule 2: Handle number comparisons
         else if (Fraction.isValidNumber(a) && Fraction.isValidNumber(b)) {
            switch (cmd) {
               case '>': push(a.greaterThan(b)); break;
               case '>=': push(a.greaterThanOrEqual(b)); break;
               case '==': push(a.equals(b)); break;
            }
         }
         // Rule 3: Handle comparisons of same primitive types (string or boolean)
         else if (typeof a === typeof b && (typeof a === 'string' || typeof a === 'boolean')) {
            switch (cmd) {
               case '>': push(a > b); break;
               case '>=': push(a >= b); break;
               case '==': push(a === b); break;
            }
         }
         // Rule 4: For '==' on other object types (vectors, quotations), use reference equality.
         else if (cmd === '==' && typeof a === 'object' && typeof b === 'object') {
            console.log(`[DEBUG] Comparing two objects by reference.`);
            push(a === b);
         }
         // Any other case is a type mismatch error.
         else {
           const typeA = a.type ? a.type : (Array.isArray(a) ? 'vector' : typeof a);
           const typeB = b.type ? b.type : (Array.isArray(b) ? 'vector' : typeof b);
           throw new Error(`Type Error: Cannot compare values of different types: ${typeA} and ${typeB}.`);
         }
       }

       // Vector creation
       else if (cmd === 'VECTOR') {
           const count = pop();
           if(!Fraction.isValidNumber(count)) throw new Error('VECTOR requires a numeric count.');
           const numCount = count.valueOf();
           if (numCount > dataStack.length) throw new Error('Stack underflow for VECTOR creation.');
           const vec = [];
           for (let j = 0; j < numCount; j++) {
               vec.unshift(pop());
           }
           push(vec);
       }

       // Stack manipulation words
       else if (cmd === 'DUP') push(peek());
       else if (cmd === 'DROP') pop();
       else if (cmd === 'SWAP') { const b = pop(); const a = pop(); push(b); push(a); }

       // Assignment
       else if (cmd === '=') {
         const nameToken = pop();
         const value = pop();
         if (nameToken.type !== Types.SYMBOL) throw new Error("Assignment target must be a symbol.");
         const name = nameToken.value;
         
         // 代入時も英数字シンボルの大文字チェック
         if (/^[a-zA-Z0-9]+$/.test(name) && name !== name.toUpperCase()) {
           throw new Error(`Symbol names with alphanumeric characters must be uppercase: '${name}'. Use '${name.toUpperCase()}' instead.`);
         }
         
         console.log(`[DEBUG] Assigning to "${name}"`);
         if (value.type === 'quotation') environment.functions[name] = value.value;
         else environment.variables[name] = value;
       }
       
       // Lazy conditional
       else if (cmd === 'IF') {
           const elseBranch = pop();
           const thenBranch = pop();
           const condition = pop();
           if (typeof condition !== 'boolean') throw new Error("Type Error: IF requires a Boolean (cyan) on top of the stack.");
           if (elseBranch.type !== 'quotation' || thenBranch.type !== 'quotation') throw new Error("Syntax Error: IF requires two quotations {then} {else}.");
           executeTokens(condition === true ? thenBranch.value : elseBranch.value, localEnv);
       }

       // Variable/Function/Whitespace lookup and execution
       else {
         if (cmd in environment.functions) {
           console.log(`[DEBUG] Executing function: "${cmd}"`);
           executeTokens(environment.functions[cmd], localEnv);
         } else if (cmd in environment.variables) {
           const value = environment.variables[cmd];
           // 空のquotationが代入されている場合は、空白文字として扱う（何もpushしない）
           if (value && value.type === 'quotation' && value.value.length === 0) {
             console.log(`[DEBUG] "${cmd}" is defined as whitespace (empty quotation), ignoring`);
             // 何もしない（空白文字として機能）
           } else {
             console.log(`[DEBUG] Pushing variable: "${cmd}"`);
             push(value);
           }
         } else if (token.type === Types.WHITESPACE || /^\s+$/.test(cmd)) {
           console.log(`[DEBUG] Ignoring whitespace: "${cmd}"`);
         }
         else {
           console.log(`[DEBUG] Pushing unevaluated symbol for assignment: "${cmd}"`);
           push(token);
         }
       }
     }
     logStackState("Stack at end of token processing:");
   }
   logStackState("Final Stack State for this execution context:");
   console.groupEnd();
 };

 const formatValue = (value, short = false) => {
   if (value && value.type === Types.NIL) return "nil";
   if (Fraction.isValidNumber(value)) return value.toString();
   if (value && value.type === 'quotation') return short ? "{...}" : `{ ${value.value.map(t=>t.value).join(' ')} }`;
   if (Array.isArray(value)) return `[ ${value.map(v => formatValue(v, true)).join(' ')} ]`;
   if (typeof value === 'string') return value;  // 引用符なしで返す
   if (value === true) return "TRUE";
   if (value === false) return "FALSE";
   if (value === null || value === undefined) return "undefined";
   return String(value);
 };
 
 return {
   execute: (editor) => {
     dataStack = [];
     try {
       const tokens = tokenize(editor);
       if (tokens.length === 0) return "OK (stack empty)";
       executeTokens(tokens);
       if (dataStack.length === 0) return "OK (stack empty)";
       if (dataStack.length > 1) return "Stack: " + `[ ${dataStack.map(v => formatValue(v, true)).join(' ')} ]`;
       return formatValue(pop());
     } catch (err) {
       dataStack = [];
       console.error("[ERROR]", err);
       return `Error: ${err.message}`;
     }
   },
 };
})();