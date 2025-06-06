아래는 **TypeScript/JavaScript/TSX** 코드에서 `undefined`, `unknown`, `any` 등 불명확한 타입을 최소화하고, 대신 **안전하고 명확한 타입**을 사용할 수 있는 실무적인 가이드라인을 담은 Markdown 문서 예시입니다. 각 항목마다 관련 **참고 자료**를 풍부하게 인용하여, 왜 이러한 원칙을 따라야 하는지, 실제 코드에 어떻게 적용할 수 있는지 자세히 설명했습니다.

---

## 요약

1. **`undefined`를 방지하기 위해**

   * **`strictNullChecks` 설정** 및 `Optional`/`NonNullable` 활용: `undefined`와 `null`을 명시적으로 구분해 컴파일 시점에 에러를 잡습니다 ([spin.atomicobject.com][1], [typescriptlang.org][2]).
   * **`interface`/`type`에 옵셔널 프로퍼티(`?`) 지정**: “이 값은 있을 수도, 없을 수도 있다”를 명확하게 선언해, 런타임 오류를 예방합니다 ([spin.atomicobject.com][1], [stackoverflow.com][3]).

2. **`any` 대신 `unknown` 또는 구체적 타입 사용**

   * `any`는 타입 검사를 완전히 비활성화하므로, 신규 코드에서는 **절대로** 사용하지 않습니다 ([typescriptlang.org][2], [medium.com][4]).
   * 대신 `unknown`을 사용해 “일단 모든 값을 받아들이되, 사용하는 시점에 반드시 타입 검사를 거치도록” 강제합니다 ([yosephintechnicolor.medium.com][5], [blog.logrocket.com][6]).

3. **`unknown` 활용 시 주의사항**

   * `unknown`을 사용했다면, **타입 가드(type guard)** 또는 **타입 단언(type assertion)** 을 통해 구체적인 타입으로 \*\*“형변환”\*\*해야만 실제 프로퍼티 접근 및 연산이 가능합니다 ([ceos3c.com][7], [dev.to][8]).
   * `never` 타입과 결합하여 \*\*“코드 논리적으로 절대 도달하지 않는 지점”\*\*을 컴파일러 레벨에서 표현할 수 있습니다 ([blog.logrocket.com][6], [stackoverflow.com][3]).

4. **JS/TSX 파일 내에서 전역 객체(`window`, `global`) 사용 최소화**

   * **`typeof window !== 'undefined'` 같은 런타임 체크**를 지양하고, Next.js/React에서는 `useEffect` 훅이나 `next/dynamic({ ssr: false })`를 통해 “클라이언트 전용 코드”를 분리합니다 ([reddit.com][9]).
   * Electron 환경이라면, **Webpack의 `target: 'electron-renderer'` + `ProvidePlugin`** 설정을 통해 런타임 폴리필을 처리하고, 코드 내부에 `if (typeof global === 'undefined') ...` 같은 검사를 남기지 않습니다 .

---

## 1. `undefined` 관리: `strictNullChecks`와 옵셔널 프로퍼티

### 1.1. `strictNullChecks` 활성화

TypeScript 설정(`tsconfig.json`)에서 `strictNullChecks: true`를 켜면, 모든 변수/프로퍼티에 암묵적 `undefined`가 허용되지 않습니다.

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    // ...
  }
}
```

* **효과**: `string` 타입에는 `undefined`나 `null`이 포함되지 않아, `undefined`가 할당되면 컴파일 에러가 발생합니다 ([spin.atomicobject.com][1], [typescriptlang.org][2]).

### 1.2. 옵셔널 프로퍼티 선언 (`?`)

인터페이스나 타입에서 “이 필드는 선택 사항”임을 명확히 지정합니다.

```ts
interface User {
  id: number;
  name: string;
  email?: string; // 이 필드는 있거나 없을 수 있다
}
```

* `email?: string` → 내부적으로 `email: string | undefined`와 동일 ([spin.atomicobject.com][1], [stackoverflow.com][3]).
* 꺼내서 사용할 때는 반드시 체크 필요:

  ```ts
  function greet(user: User) {
    if (user.email) {
      console.log(`Hello, your email is ${user.email.toLowerCase()}`);
    } else {
      console.log("Hello, no email provided.");
    }
  }
  ```

### 1.3. `NonNullable<T>` 유틸리티 타입

`NonNullable<T>`를 사용해 “`null`과 `undefined`를 제거한 타입”을 얻습니다.

```ts
type PossiblyUndefined = string | undefined;
type NotNullable = NonNullable<PossiblyUndefined>; // string
```

* **예시**: 함수 인자를 `T | undefined`에서 `T`만 쓰고 싶을 때:

  ```ts
  function processValue<T>(val: T | undefined): NonNullable<T> {
    if (val === undefined) {
      throw new Error("Value is undefined");
    }
    return val; // 이제 컴파일러는 T라고 인식
  }
  ```
* `NonNullable`은 내부적으로 `Exclude<T, null | undefined>`와 동일하여, 런타임 전에 철저히 `undefined` 제거 검사를 수행할 수 있습니다 ([stackoverflow.com][3], [spin.atomicobject.com][1]).

---

## 2. `any` 대신 `unknown` 사용하기

### 2.1. 왜 `any`를 배제해야 하는가?

* `any`는 TypeScript 컴파일러에게 “이 변수에 대해서는 전혀 타입 체크를 하지 마라”라고 지시합니다. 즉, **타입 안정성(type safety)이 완전히 사라지게** 됩니다 ([typescriptlang.org][2], [medium.com][4]).
* 실무에서 `any`를 쓰면, 코드베이스 전반에 **타입 에러 누락 위험**이 증가하여 유지보수 비용이 급증합니다 ([allthingstypescript.dev][10], [medium.com][4]).

### 2.2. `unknown`의 장점

* `unknown`은 \*\*“가장 폭넓은 타입”\*\*으로, 모든 값을 허용하지만, **직접적으로 속성 접근이나 연산을 하지 못하도록 막습니다**. 이를 통해 “사용 전에 반드시 타입 검사”하도록 강제합니다 ([ceos3c.com][7], [dev.to][8]).
* 기본 예시:

  ```ts
  let dataAny: any = fetchSomething();
  dataAny.someMethod(); // OK, 런타임 오류 발생 가능성 있지만 컴파일러는 허용

  let dataUnknown: unknown = fetchSomething();
  dataUnknown.someMethod(); 
  // Error: Object is of type 'unknown'
  ```

  * 이 시점에서 **타입 가드**를 통해 `unknown`을 구체적인 타입으로 좁혀야만 속성 접근이 가능합니다.

### 2.3. `unknown`을 올바르게 좁히는 방법

#### 2.3.1. `typeof` 기반 가드

```ts
function printValue(x: unknown) {
  if (typeof x === "string") {
    console.log(x.toUpperCase()); // 이제 x는 string
  } else if (typeof x === "number") {
    console.log(x.toFixed(2));    // 이제 x는 number
  } else {
    console.log("Unknown type");
  }
}
```

* `typeof` 검사 구문 내에서, 컴파일러는 `x`가 해당 특정 타입(`string` 또는 `number`)이라고 추론합니다 ([ceos3c.com][7], [blog.logrocket.com][6]).

#### 2.3.2. `instanceof` 기반 가드

```ts
function handleDate(x: unknown) {
  if (x instanceof Date) {
    console.log(x.toISOString()); // now x is Date
  } else {
    console.log("Not a Date");
  }
}
```

* `instanceof Date` 검사를 통해 런타임 시 클래스 인스턴스 여부를 판단하고, 컴파일러도 타입을 좁혀 줍니다 ([ceos3c.com][7], [blog.logrocket.com][6]).

#### 2.3.3. 사용자 정의 타입 가드 (Type Predicate)

```ts
interface User { id: number; name: string; }

function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    typeof (obj as any).id === "number" &&
    "name" in obj &&
    typeof (obj as any).name === "string"
  );
}

function greetUnknown(obj: unknown) {
  if (isUser(obj)) {
    console.log(`Hello, ${obj.name}`); // x는 User
  } else {
    console.log("Not a valid User");
  }
}
```

* `obj is User`라는 **Type Predicate**를 사용하여, 런타임 검사 후 컴파일러도 `obj`를 `User` 타입으로 인식하게 합니다 ([ceos3c.com][7], [dev.to][8]).

---

## 3. `never` 타입을 사용해 논리적 도달 불가 지점 표시하기

### 3.1. `never`란?

* \*\*`never`\*\*는 **아무 값도 가질 수 없는 타입**으로, 함수가 항상 예외를 던지거나(`throw`) 무한루프(`while(true)`)에 빠지는 경우 등에 사용됩니다 ([blog.logrocket.com][6], [stackoverflow.com][3]).
* 예시:

  ```ts
  function assertNever(x: never): never {
    throw new Error("Unexpected value: " + x);
  }

  type Shape = "circle" | "square";
  function getArea(shape: Shape) {
    switch (shape) {
      case "circle":
        return Math.PI * 1; // 예시
      case "square":
        return 1 * 1;
      default:
        return assertNever(shape); // shape는 절대 never가 아님. 컴파일러가 경고를 줌
    }
  }
  ```
* 위 코드에서, `shape`가 `"circle"` 또는 `"square"` 외의 값을 가질 수 없는 상황이므로, `default` 구문에 도달하면 컴파일러가 “`shape`가 `never`여야 한다”라고 경고합니다. 즉 **각 케이스를 빠뜨리지 않도록** 강제합니다 ([blog.logrocket.com][6], [stackoverflow.com][3]).

---

## 4. JS/TSX 환경에서 전역 객체(`window`, `global`) 접근 최소화

### 4.1. 문제: “`typeof window !== 'undefined'`” 코드가 난무

* Next.js/React 프로젝트에서 \*\*서버 사이드 렌더링(SSR)\*\*을 사용할 때, “`window`나 `document`가 존재하지 않아서 생기는 런타임 에러”를 막기 위해 많은 개발자가 코드 곳곳에 `if (typeof window !== 'undefined')`를 넣습니다.
* 하지만 이렇게 할 경우:

  1. 코드가 **지저분**해지고 중복 검사가 늘어남 ([reddit.com][9]).
  2. 테스트용 환경(Jest 등)에서도 또다시 `global.window`나 `global.document`를 모킹해야 하므로 **테스트 설정이 복잡해짐** ([reddit.com][9]).

### 4.2. 권장: `useEffect` 훅으로 클라이언트 전용 로직 분리

* React 컴포넌트에서는 **`useEffect`** 안에 “브라우저 전용 코드”를 두면, 서버 컴파일 단계에서는 해당 코드가 실행되지 않습니다.
* 예시 (`_app.tsx`):

  ```tsx
  import type { AppProps } from "next/app";
  import { useEffect } from "react";
  import dynamic from "next/dynamic";

  // 브라우저 전용 컴포넌트를 동적 로드 (SSR 제외)
  const ElectronOnlyComponent = dynamic(
    () => import("../src/renderer/components/ElectronOnlyComponent"),
    { ssr: false }
  );

  function MyApp({ Component, pageProps }: AppProps) {
    useEffect(() => {
      // 브라우저에서만 실행됨
      console.log("Running on client side");
    }, []);

    return (
      <>
        <ElectronOnlyComponent /> {/* SSR 단계에서는 완전히 제외 */}
        <Component {...pageProps} />
      </>
    );
  }

  export default MyApp;
  ```

  * **핵심**: `useEffect`는 오직 클라이언트에서만 실행되므로, **서버 빌드 시점에는 자연스럽게 건너뜁니다** ([reddit.com][9]).
  * 동적 로드(`next/dynamic({ ssr: false })`)를 사용하면, **해당 컴포넌트 자체를 SSR 번들에서 제외**할 수 있습니다 .

### 4.3. Electron + Webpack 설정을 통한 전역 폴리필

* Electron 렌더러 프로세스에서는 **`nodeIntegration: false`**, **`contextIsolation: true`** 설정 상태에서 `global`이나 `process`를 직접 사용할 수 없습니다. .
* **Webpack 설정**(`next.config.js`나 `webpack.config.js`)에서 `target: 'electron-renderer'`와 `ProvidePlugin`을 활용해, 전역 객체 폴리필을 자동으로 처리해 줍니다 .

  ```js
  // next.config.js 예시
  const webpack = require("webpack");

  module.exports = {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // 1) Electron 렌더러로 타겟 변경
        config.target = "electron-renderer";

        // 2) Node 내장 모듈 폴리필 설정
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: require.resolve("path-browserify"),
          stream: require.resolve("stream-browserify"),
          buffer: require.resolve("buffer"),
          os: false,
          crypto: false,
          util: false,
        };

        // 3) ProvidePlugin으로 전역 객체 제공
        config.plugins.push(
          new webpack.ProvidePlugin({
            global: ["globalThis"],             // global 변수를 globalThis로 치환
            process: "process/browser",         // process 폴리필
            Buffer: ["buffer", "Buffer"],       // Buffer 폴리필
          })
        );
      }
      return config;
    },
  };
  ```

  * 이런 설정을 통해, 애플리케이션 코드에 `if (typeof global === 'undefined')` 같은 검사를 **한 줄도 남기지 않아도**, 컴파일러와 번들러가 자동으로 필요한 폴리필을 주입해 줍니다 .

---

## 5. Code Review: 잘못된 예제 vs. 올바른 예제

### 5.1. 잘못된 패턴: `undefined` 검사 난발, `any` 남용

```ts
// 예시: 잘못된 코드
function processData(data: any) {
  if (data === undefined || data === null) {
    console.log("No data");
  } else {
    // data가 string인지 number인지도 확인하지 않음
    console.log(data.toString());
  }
}

// React 컴포넌트 (SSR 단계에서도 실행)
function MyComponent() {
  if (typeof window !== "undefined") {
    console.log("Client side");
  }
  // Electron 폴리필 없이 global 사용
  console.log(global.someValue); // 런타임 에러 발생 가능
  return <div>Hello</div>;
}
```

* **문제점**

  1. `any` 사용(\$\rightarrow\$ 타입 안전성 없음) ([typescriptlang.org][2], [medium.com][4]).
  2. 모든 흐름에 `data.toString()`을 호출하므로, `data`가 객체나 함수라면 런타임 에러 발생 가능.
  3. React 컴포넌트에서 `typeof window` 검사→코드 중복.
  4. Electron 환경에서 `global`을 직접 사용(\$\rightarrow\$ `contextIsolation` 모드에서 `require is not defined` 오류) .

---

### 5.2. 올바른 패턴: `unknown` + 타입 가드 + `strictNullChecks` + 폴리필

```ts
// good.ts

// 1. strictNullChecks: true 상태 가정
function processData(data: unknown): string {
  // 타입 가드: null/undefined 체크
  if (data === null || data === undefined) {
    return "No data";
  }

  // 타입 가드: string/number 여부 확인
  if (typeof data === "string") {
    return data.toUpperCase(); // 안전하게 사용
  } else if (typeof data === "number") {
    return data.toFixed(2);
  }

  // 이 지점에 오면 data는 string | number | null | undefined 외의 값
  // never 타입을 활용해 논리적 오류를 컴파일러가 잡을 수 있게 함
  throw new Error(`Unsupported data type: ${typeof data}`); // data: never
}

// 2. React 컴포넌트: useEffect로 클라이언트 로직 분리
import dynamic from "next/dynamic";
import type { AppProps } from "next/app";
import { useEffect } from "react";

const ElectronOnlyComponent = dynamic(
  () => import("../src/renderer/components/ElectronOnlyComponent"),
  { ssr: false } // SSR 단계에서 제외
);

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // 브라우저 전용 로직, SSR 시 무시
    console.log("Running on client");
  }, []);

  return (
    <>
      <ElectronOnlyComponent /> {/* Electron 전용 기능은 클라이언트에서만 로드 */}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
```

* **개선점**

  1. `processData`: 매개변수를 `unknown`으로 받았고, 런타임 시점에 `typeof` 체크를 통해 안전하게 `string`과 `number`로 좁힘 ([ceos3c.com][7], [blog.logrocket.com][6]).
  2. `never` 타입을 활용해 “처리할 수 없는 타입이 들어올 경우 컴파일러 에러를 유도”하도록 `throw new Error(...)`를 둠 ([blog.logrocket.com][6], [stackoverflow.com][3]).
  3. React 컴포넌트: `useEffect` 내부만 클라이언트 전용 로직을 담아 SSR 시 자연스럽게 무시되도록 구성 ([reddit.com][9]).
  4. Electron 전용 기능(`ElectronOnlyComponent`)은 `ssr: false`로 동적 로드하여 서버 빌드 시 완전히 제외 .

---

## 6. 실습 과제

다음 과제를 통해 실제 프로젝트에 위 원칙을 적용해 보세요.

### 과제 1. `any`→`unknown` 전환

* 기존 JS/TS 파일 중 `any`가 쓰인 부분을 찾아, **`unknown`으로 변경**하고, **타입 가드를 추가**하여 컴파일 오류 없이 작동하도록 수정해 보세요 ([yosephintechnicolor.medium.com][5], [dev.to][8]).

### 과제 2. 옵셔널 프로퍼티 명시

* 프로젝트 내 **모든 `interface`/`type`** 중에서 “사실상 선택적(optional)”으로 쓰이는 프로퍼티에 `?`를 붙이고, 이를 사용하는 위치에 **`if (x?.prop)`** 같은 안전한 접근 방식을 도입해 보세요 ([spin.atomicobject.com][1], [stackoverflow.com][3]).

### 과제 3. Electron 전역 폴리필 제거

* Electron 렌더러용 TSX/JSX 코드에서 “`if (typeof global === 'undefined') ...`”나 “`require is not defined`” 문제를 **Webpack 설정**(`next.config.js` 또는 `webpack.config.js`)을 사용하여 해결해 보세요. .

### 과제 4. `never`로 완전한 분기 처리

* `switch`나 `if`체인 내에 “절대 들어올 수 없는” 분기(default/else)를 발견했다면, 해당 분기를 `assertNever()` 함수(`never` 반환)로 처리하여 컴파일러가 “미처리 분기가 없는지” 체크하도록 개선해 보세요 ([stackoverflow.com][3], [blog.logrocket.com][6]).

---

## 7. 결론

* **`undefined`와 `any`를 코드에서 제거**하고, **`unknown`, `never`, `strictNullChecks`, `Optional` 등을 최대한 활용**하여 타입 안전성을 확보하세요.
* **클라이언트 전용 코드**(브라우저 API 사용, Electron 전역 객체 참조 등)는 **SSR 과정에서 제외**시키거나, **빌드 설정 단계**에서 폴리필을 일괄 적용해 두세요.
* 위 가이드에 따라 코드베이스를 정리하면, **런타임 오류를 사전에 방지**하고, **유닛 테스트/통합 테스트 작성**도 훨씬 용이해집니다.

이 문서를 참고하여 **JavaScript/TypeScript/TSX** 프로젝트 전반에 일관된 **“타입 안정성(type safety)”** 원칙을 적용해 보시기 바랍니다.

---

### 인용 목록

1. **“How to Deal with ‘Optional’ and ‘Undefined’ in TypeScript”** (Spin Atomic Object) ([spin.atomicobject.com][1])
2. **“Documentation - Do’s and Don’ts - TypeScript”** (TypeScript 공식 문서) ([typescriptlang.org][2])
3. **“Restrict generic type T to not being undefined in TypeScript?”** (Stack Overflow) ([stackoverflow.com][3])
4. **“TypeScript Unknown Type: Complete Guide to Safe Type Handling”** (CEOS3C) ([ceos3c.com][7])
5. **“When to use never and unknown in TypeScript”** (LogRocket Blog) ([blog.logrocket.com][6])
6. **“Stop using the type “any” in Typescript. Use “unknown” instead.”** (Medium) ([yosephintechnicolor.medium.com][5])
7. **“Typescript – why to use “unknown” instead of “any””** (DEV Community) ([dev.to][8])
8. **“Avoid the any Type in TypeScript”** (AllThingsTypeScript) ([allthingstypescript.dev][10])
9. **“Avoid the Any Type in TypeScript”** (Andrew Crites, Medium) ([medium.com][4])
10. **“Uncaught ReferenceError: global is not defined (Electron + Next.js)”** (Stack Overflow)
11. **“require is not defined when passing `contextIsolation: true`”** (Stack Overflow)
12. **“What’s the purpose of `if (typeof window !== 'undefined')`?”** (Stack Overflow) ([reddit.com][9])

**이상으로**, `undefined`, `any`, `unknown` 같은 모호한 타입 사용을 지양하고 **명확한 타입 선언과 빌드 설정**을 통해 안정적인 코드베이스를 구축하는 방안을 정리했습니다.

[1]: https://spin.atomicobject.com/optional-undefined-typescript/?utm_source=chatgpt.com "How to Deal with “Optional” and “Undefined” in TypeScript"
[2]: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html?utm_source=chatgpt.com "Documentation - Do's and Don'ts - TypeScript"
[3]: https://stackoverflow.com/questions/63045362/restrict-generic-type-t-to-not-being-undefined-in-typescript?utm_source=chatgpt.com "Restrict generic type T to not being undefined in TypeScript?"
[4]: https://medium.com/%40ExplosionPills/avoid-the-any-type-in-typescript-aba2496d1e6a?utm_source=chatgpt.com "Avoid the `any` Type in TypeScript | by Andrew Crites - Medium"
[5]: https://yosephintechnicolor.medium.com/stop-using-the-type-any-in-typescript-use-unknown-instead-904492bdffc9?utm_source=chatgpt.com "Stop using the type “any” in Typescript. Use “unknown” instead."
[6]: https://blog.logrocket.com/when-to-use-never-unknown-typescript/?utm_source=chatgpt.com "When to use never and unknown in TypeScript - LogRocket Blog"
[7]: https://www.ceos3c.com/javascript/typescript-unknown-type-complete-guide-to-safe-type-handling/?utm_source=chatgpt.com "TypeScript Unknown Type: Complete Guide to Safe Type Handling"
[8]: https://dev.to/arikaturika/typescript-why-to-use-unknown-instead-of-any-41i8?utm_source=chatgpt.com "Typescript - why to use \"unknown\" instead of \"any\" - DEV Community"
[9]: https://www.reddit.com/r/typescript/comments/l8il55/any_resource_or_tutorial_on_best_practices_for/?utm_source=chatgpt.com "Any resource or tutorial on best practices for handling undefined ..."
[10]: https://www.allthingstypescript.dev/p/why-avoid-the-any-type-in-typescript?utm_source=chatgpt.com "Why avoid the Any Type in Typescript - by Maina Wycliffe"
