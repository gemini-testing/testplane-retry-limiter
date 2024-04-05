# @testplane/retry-limiter

## Обзор

Используйте плагин `@testplane/retry-limiter`, чтобы ограничивать количество ретраев упавших тестов, а также время, в течение которого ретраи разрешены.

_Используйте данный плагин при прогоне тестов в CI. &mdash; Так как в CI, как правило, прогоняются либо все тесты проекта, либо их значительная часть._

_Использовать плагин `@testplane/retry-limiter` при локальных запусках отдельных тестов чаще всего нецелесообразно, ввиду их малого количества и, соответственно, отсутствия значимого эффекта от экономии «железа» или времени на прогон тестов._

Ретраи упавших тестов &mdash; один из способов борьбы с нестабильными тестами. Однако, бывают случаи, когда тесты падают массово из-за проблем с инфраструктурой или из-за того, что код проекта был сломан (например, в пулл-реквесте). В таких случаях ретраи только зря тратят ресурсы серверов, на которых прогоняются тесты, и время разработчика, заставляя разработчика ждать окончания прогона тестов, которые заведомо упадут.

Чтобы избежать подобных сценариев, плагин `@testplane/retry-limiter` позволяет:
* задать максимальную долю ретраев от общего количества тестов;
* ограничить время, в течение которого ретраи могут использоваться;
* снизить максимальное количество ретраев для всех тестов, если хотя бы один из тестов упадет, несмотря на все ретраи.

Например, если в проекте запускаются 1000 тестов и для параметра `limit` в конфиге плагина установлено значение _0.3,_ то при падении тестов будет максимально разрешено _300_ ретраев.

Если в конфиге плагина ещё установлено значение _600 секунд (10 минут)_ для параметра `timeLimit`, то независимо от того, сколько раз ещё можно ретраить упавшие тесты, плагин отключит механизм ретраев через _10 минут_ после начала прогона тестов. Последнее защищает от нерациональной траты ресурсов «железа» на слишком долгие прогоны тестов.

Если гермиона запущена с опцией `--retry`, например, со значением _7_, и при этом в конфиге плагина `@testplane/retry-limiter` параметр `setRetriesOnTestFail` установлен в значение _4_, то это означает следующее: в случае падения хотя бы одного теста в любом из браузеров после _7_ ретраев, плагин посчитает, что возникла какая-то системная проблема и нужно снизить максимально разрешенное число ретраев до значения, заданного в параметре `setRetriesOnTestFail`, то есть до _4_. Это также позволяет защититься от нерационального расхода ресурсов на прогон тестов в случае системных проблем.

_Если вы столкнулись в своем проекте с ситуацией, когда механизм ретраев начинает отключаться из-за превышения `timeLimit`, то не рекомендуется бездумно увеличивать это время. Стоит разобраться, почему прогон тестов начал выполняться слишком долго, а не «заливать железом» реальную проблему со стабильностью прогонов тестов._

## Установка

```bash
npm install -D @testplane/retry-limiter
```

## Настройка

Необходимо подключить плагин в разделе `plugins` конфига `hermione`:

```javascript
module.exports = {
    plugins: {
        '@testplane/retry-limiter': {
            limit: 0.3, // разрешаем не больше 30% ретраев от общего числа тестов
            setRetriesOnTestFail: 4, // снижаем число ретраев до 4 после падения первого теста
            timeLimit: 600 // через 10 минут ретраи должны быть отключены
        },

        // другие плагины гермионы...
    },

    // другие настройки гермионы...
};
```

### Расшифровка параметров конфигурации

| **Параметр** | **Тип** | **По&nbsp;умолчанию** | **Описание** |
| ------------ | ------- | --------------------- | ------------ |
| enabled | Boolean | true | Включить / отключить плагин. |
| limit | Number | 1 | Максимально разрешенная доля ретраев от общего количества тестов. Задается как число в диапазоне от 0 до 1. После превышения заданной доли ретраев ретраи будут отключены. |
| setRetriesOnTestFail | Number | Infinity | Число ретраев, до которого надо снизить разрешенное число ретраев, если упадет хотя бы один тест, несмотря на все ретраи. |
| timeLimit | Number | Infinity | Время в секундах, после истечения которого ретраи будут отключены. |

### Передача параметров через CLI

Все параметры плагина, которые можно определить в конфиге, можно также передать в виде опций командной строки или через переменные окружения во время запуска гермионы. Используйте префикс `--retry-limiter-` для опций командной строки и `retry_limiter_` &mdash; для переменных окружения. Например:

```bash
npx hermione --retry-limiter-time-limit=900
```

```bash
retry_limiter_time_limit=900 npx hermione
```

## Использование

При использовании плагина в логах гермионы вы можете увидеть сообщения следующего вида:

```bash
retry-limiter: will stop retrying tests after 600 seconds
```

```bash
retry-limiter: with limit 0.3 will stop retrying tests after 1189 retries
```

В первом сообщении плагин информирует об ограничении времени работы механизма ретраев.
Во втором сообщении &mdash; об ограничении общего количества ретраев.