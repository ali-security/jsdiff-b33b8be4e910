import {parsePatch} from '../../lib/patch/parse';

import {expect} from 'chai';

describe('patch/parse', function() {
  describe('#parse', function() {
    it('should parse basic patches', function() {
      expect(parsePatch(
`@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5`))
        .to.eql([{
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });
    it('should parse single line hunks', function() {
      expect(parsePatch(
`@@ -1 +1 @@
-line3
+line4`))
        .to.eql([{
          hunks: [
            {
              oldStart: 1, oldLines: 1,
              newStart: 1, newLines: 1,
              lines: [
                '-line3',
                '+line4'
              ],
              linedelimiters: [
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });
    it('should parse multiple hunks', function() {
      expect(parsePatch(
`@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5
@@ -4,3 +1,4 @@
 line2
 line3
-line4
 line5`))
        .to.eql([{
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            },
            {
              oldStart: 4, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '-line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });
    it('should parse single index patches', function() {
      expect(parsePatch(
`Index: test
===================================================================
--- from\theader1
+++ to\theader2
@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5`))
        .to.eql([{
          index: 'test',
          oldFileName: 'from',
          oldHeader: 'header1',
          newFileName: 'to',
          newHeader: 'header2',
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });
    it('should parse multiple index files', function() {
      expect(parsePatch(
`Index: test
===================================================================
--- from\theader1
+++ to\theader2
@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5
Index: test2
===================================================================
--- from\theader1
+++ to\theader2
@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5`))
        .to.eql([{
          index: 'test',
          oldFileName: 'from',
          oldHeader: 'header1',
          newFileName: 'to',
          newHeader: 'header2',
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }, {
          index: 'test2',
          oldFileName: 'from',
          oldHeader: 'header1',
          newFileName: 'to',
          newHeader: 'header2',
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });

    it('should parse multiple files without the Index line', function() {
      expect(parsePatch(
`--- from\theader1
+++ to\theader2
@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5
--- from\theader1
+++ to\theader2
@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5`))
        .to.eql([{
          oldFileName: 'from',
          oldHeader: 'header1',
          newFileName: 'to',
          newHeader: 'header2',
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }, {
          oldFileName: 'from',
          oldHeader: 'header1',
          newFileName: 'to',
          newHeader: 'header2',
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });

 it('should parse patches with filenames having quotes and back slashes', function() {
      expect(parsePatch(
`Index: test
===================================================================
--- "from\\\\a\\\\file\\\\with\\\\quotes\\\\and\\\\backslash"\theader1
+++ "to\\\\a\\\\file\\\\with\\\\quotes\\\\and\\\\backslash"\theader2
@@ -1,3 +1,4 @@
 line2
 line3
+line4
 line5`))
        .to.eql([{
          index: 'test',
          oldFileName: 'from\\a\\file\\with\\quotes\\and\\backslash',
          oldHeader: 'header1',
          newFileName: 'to\\a\\file\\with\\quotes\\and\\backslash',
          newHeader: 'header2',
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                ' line2',
                ' line3',
                '+line4',
                ' line5'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });

    it('should note added EOFNL', function() {
      expect(parsePatch(
`@@ -1,3 +1,4 @@
-line5
\\ No newline at end of file`))
        .to.eql([{
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                '-line5',
                '\\ No newline at end of file'
              ],
              linedelimiters: [
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });
    it('should note removed EOFNL', function() {
      expect(parsePatch(
`@@ -1,3 +1,4 @@
+line5
\\ No newline at end of file`))
        .to.eql([{
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                '+line5',
                '\\ No newline at end of file'
              ],
              linedelimiters: [
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });
    it('should ignore context no EOFNL', function() {
      expect(parsePatch(
`@@ -1,3 +1,4 @@
+line4
 line5
\\ No newline at end of file`))
        .to.eql([{
          hunks: [
            {
              oldStart: 1, oldLines: 3,
              newStart: 1, newLines: 4,
              lines: [
                '+line4',
                ' line5',
                '\\ No newline at end of file'
              ],
              linedelimiters: [
                '\n',
                '\n',
                '\n'
              ]
            }
          ]
        }]);
    });

    it('should perform sanity checks on line numbers', function() {
      parsePatch('@@ -1 +1 @@', {strict: true});

      expect(function() {
        parsePatch('@@ -1 +1,4 @@', {strict: true});
      }).to['throw']('Added line count did not match for hunk at line 1');
      expect(function() {
        parsePatch('@@ -1,4 +1 @@', {strict: true});
      }).to['throw']('Removed line count did not match for hunk at line 1');
    });

    it('should not throw on invalid input', function() {
      expect(parsePatch('blit\nblat\nIndex: foo\nfoo'))
          .to.eql([{
            hunks: [],
            index: 'foo'
          }]);
    });
    it('should throw on invalid input in strict mode', function() {
      expect(function() {
        parsePatch('Index: foo\n+++ bar\nblah', {strict: true});
      }).to['throw'](/Unknown line 3 "blah"/);
    });

    it('should handle OOM case', function() {
      parsePatch('Index: \n===================================================================\n--- \n+++ \n@@ -1,1 +1,2 @@\n-1\n\\ No newline at end of file\n+1\n+2\n');
    });

    it('should parse the index name from Index: and Mercurial diff -r headers', function() {
      expect(parsePatch('Index: something with multiple words  \n'))
        .to.eql([{
          index: 'something with multiple words',
          hunks: []
        }]);
      expect(parsePatch('Index:\tfoo.txt\t\n'))
        .to.eql([{
          index: 'foo.txt',
          hunks: []
        }]);
      expect(parsePatch('diff -r 9117c6561b0b -r 273ce12ad8f1 .hgignore\n'))
        .to.eql([{
          index: '.hgignore',
          hunks: []
        }]);
    });

    it('should parse Mercurial-style diff -r header and index filename', function() {
      const patchStr = [
        'diff -r 9117c6561b0b -r 273ce12ad8f1 .hgignore',
        '--- /dev/null\tThu Jan 01 00:00:00 1970 +0000',
        '+++ b/.hgignore\tTue May 03 13:27:13 2005 -0800',
        '@@ -0,0 +1,1 @@',
        '+.*~'
      ].join('\n');
      expect(parsePatch(patchStr)).to.eql([{
        index: '.hgignore',
        oldFileName: '/dev/null',
        oldHeader: 'Thu Jan 01 00:00:00 1970 +0000',
        newFileName: 'b/.hgignore',
        newHeader: 'Tue May 03 13:27:13 2005 -0800',
        hunks: [{
          oldStart: 1, oldLines: 0,
          newStart: 1, newLines: 1,
          lines: ['+.*~'],
          linedelimiters: ['\n']
        }]
      }]);
    });

    it('should only strip quotes from file names that are fully quoted', function() {
      expect(parsePatch(
        '--- "\theader1\n'
        + '+++ "to\theader2\n'
        + '@@ -1 +1 @@\n'
        + '-old\n'
        + '+new\n'))
        .to.eql([{
          oldFileName: '"',
          oldHeader: 'header1',
          newFileName: '"to',
          newHeader: 'header2',
          hunks: [{
            oldStart: 1, oldLines: 1,
            newStart: 1, newLines: 1,
            lines: ['-old', '+new'],
            linedelimiters: ['\n', '\n']
          }]
        }]);
    });

    // U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR. parsePatch does
    // not split lines on these, but `.` in a regex does not match them.
    const LS = String.fromCharCode(0x2028),
          PS = String.fromCharCode(0x2029);

    it('should parse adversarial Index: and diff -r headers in linear time', function() {
      // Regression test for the ReDOS half of CVE-2026-24001: a header line
      // made of a long run of whitespace followed by a U+2028 or U+2029 used
      // to take cubic time to (fail to) match the header regex.
      let padding = '';
      for (let j = 0; j < 4000; j++) {
        padding += ' ';
      }
      const start = new Date().getTime();
      const indexResult = parsePatch('Index:' + padding + 'x' + LS + 'y\n');
      const hgResult = parsePatch('diff -r 9117c6561b0b' + padding + 'x' + PS + 'y\n');
      const elapsed = new Date().getTime() - start;

      expect(elapsed).to.be.below(1000);
      expect(indexResult).to.eql([{
        index: 'x' + LS + 'y',
        hunks: []
      }]);
      expect(hgResult).to.eql([{
        index: 'x' + PS + 'y',
        hunks: []
      }]);
    });

    it('should treat non-ASCII line break characters U+2028 and U+2029 like ordinary characters', function() {
      // Regression test for CVE-2026-24001 (GHSA-73rr-hh4g-fpgx). File headers
      // containing these characters used to be recognised as headers without
      // being consumed, sending parsePatch into an infinite loop that leaked
      // memory until the process crashed.
      const patch = 'Index: t' + LS + 'e' + LS + 's' + LS + 't\n'
        + '===================================================================\n'
        + '--- f' + LS + 'o' + LS + 'o\t2023-12-20' + LS + '16:11:20.908225554' + LS + '+0000\n'
        + '+++ b' + LS + 'a' + LS + 'r\t2023-12-20' + LS + '16:11:34.391473579' + LS + '+0000\n'
        + '@@ -1,4 +1,4 @@\n'
        + ' foo\n'
        + '-bar' + LS + 'bar\n'
        + '+barry' + LS + 'barry\n'
        + ' baz\n'
        + ' qux\n'
        + '\\ No newline at end of file\n';
      expect(parsePatch(patch)).to.eql([{
        index: 't' + LS + 'e' + LS + 's' + LS + 't',
        oldFileName: 'f' + LS + 'o' + LS + 'o',
        oldHeader: '2023-12-20' + LS + '16:11:20.908225554' + LS + '+0000',
        newFileName: 'b' + LS + 'a' + LS + 'r',
        newHeader: '2023-12-20' + LS + '16:11:34.391473579' + LS + '+0000',
        hunks: [{
          oldStart: 1, oldLines: 4,
          newStart: 1, newLines: 4,
          lines: [
            ' foo',
            '-bar' + LS + 'bar',
            '+barry' + LS + 'barry',
            ' baz',
            ' qux',
            '\\ No newline at end of file'
          ],
          linedelimiters: ['\n', '\n', '\n', '\n', '\n', '\n']
        }]
      }]);
    });

    it('should not loop forever on file headers containing U+2028 or U+2029', function() {
      // Regression test for CVE-2026-24001: minimal payloads, with and without
      // quoting and a tab-separated header.
      expect(parsePatch(
        '--- "a' + PS + 'file"\theader1\n'
        + '+++ "b' + LS + 'file"\n'
        + '@@ -1 +1 @@\n'
        + '-old\n'
        + '+new\n'))
        .to.eql([{
          oldFileName: 'a' + PS + 'file',
          oldHeader: 'header1',
          newFileName: 'b' + LS + 'file',
          newHeader: '',
          hunks: [{
            oldStart: 1, oldLines: 1,
            newStart: 1, newLines: 1,
            lines: ['-old', '+new'],
            linedelimiters: ['\n', '\n']
          }]
        }]);
      expect(parsePatch('--- a' + LS + 'b\n+++ c' + PS + 'd\n'))
        .to.eql([{
          oldFileName: 'a' + LS + 'b',
          oldHeader: '',
          newFileName: 'c' + PS + 'd',
          newHeader: '',
          hunks: []
        }]);
    });
  });
});
