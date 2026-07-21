# TODO - Graph Tag/Notes Integration

## Feature 1: Grafo reflete notas em memória (não só do disco)
- [x] Restaurar lógica de merge no memo `nodes/links` (`App.tsx:502-559`): partir de `allNotesFromDisk`, sobrepor com `notes` de mesmo `id` (title→name, tags, content), anexar notas novas (UUID) não presentes no disco
- [x] Aplicar o mesmo merge no memo `localGraphData` (`App.tsx:561-618`)
- [ ] Verificar que notas novas aparecem como nós no grafo global

## Feature 2: Grafo recompute só em mudanças de id/title/tags
- [x] Criar memo `graphSignature` (~linha 500): `notes.map(n => \`${n.id}|${n.title||""}|${(n.tags||[]).join(",")}\`).join("::")` com dep `[notes]`
- [x] Adicionar `graphSignature` às deps do memo `nodes/links` (`App.tsx:559`)
- [ ] Confirmar que digitar conteúdo (sem mudar id/title/tags) NÃO reexecuta o memo do grafo
- [ ] Confirmar que adicionar/remover tag reexecuta o memo e cria/remove arestas

## Feature 3: Persistir tags de notas novas ao salvar
- [x] Em `handleSaveNewNote` (`App.tsx:644-672`), após `saveNewNote(filePath, content)`, chamar `tauriAPI.updateNoteProperties(filePath, { ...noteToSave.properties, title: noteToSave.title, date: <extraído do frontmatter>, tags: noteToSave.tags.join(", ") })`
- [x] Extrair `date` do frontmatter atual do `noteToSave.content` (parse simples) ou reusar o que já está em `properties`
- [ ] Verificar que após salvar, o arquivo `.md` no disco tem `tags: [...]` correto no frontmatter
- [ ] Verificar que tags sobrevivem a um restart do app (relê do disco)

## Feature 4: Botão "Update" funcional
- [x] Trocar `setGraphRefresh((r) => r + 1)` por `setFileTreeKey((k) => k + 1)` no botão Update (`App.tsx:1325`)
- [x] Confirmar que o efeito `useEffect` (`App.tsx:620-626`) refaz `getAllNotesForGraph` quando `fileTreeKey` muda
- [x] Avaliar se `graphRefresh` ainda é necessário como dep dos memos (agora redundante via `allNotesFromDisk`/`graphSignature`) — removido (morreo)

## Feature 5: Verificação final
- [ ] Criar nota nova → adicionar tag → grafo mostra nó + aresta tag imediatamente (sem clicar Update)
- [ ] Nota existente → mudar tag → grafo atualiza arestas sem clicar Update
- [ ] Clicar "Save" em nota nova com tags → arquivo em disco com nome correito contém tags no frontmatter
- [ ] Botão "Update" refaz fetch do disco (cobre caso de edição externa)
- [x] `pnpm lint` sem erros novos (excluídos os preexistentes de `ErrorBoundary.tsx`)
- [ ] Confirmar que digitar conteúdo no textarea NÃO reexecuta o grafo (performance preservada)
