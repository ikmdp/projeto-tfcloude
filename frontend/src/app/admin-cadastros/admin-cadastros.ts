import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Catalogo } from '../servicos/catalogo';
import { Atividades } from '../servicos/atividades';
import { Sessao } from '../servicos/sessao';

interface ItemCurso {
  nome: string;
  trabalhos: number;
}

@Component({
  selector: 'app-admin-cadastros',
  imports: [FormsModule],
  templateUrl: './admin-cadastros.html',
  styleUrl: './admin-cadastros.css',
})
export class AdminCadastros implements OnInit {
  private catalogo = inject(Catalogo);
  private atividades = inject(Atividades);
  private sessao = inject(Sessao);

  cursos: ItemCurso[] = [];
  orientadores: string[] = [];

  novoCurso = '';
  novoOrientador = '';
  erroCurso = '';
  erroOrientador = '';
  aviso = '';

  ngOnInit() {
    this.carregar();
  }

  private get nomeAdmin(): string {
    return this.sessao.usuario?.nome ?? 'Coordenação';
  }

  adicionarCurso() {
    const nome = this.novoCurso.trim().replace(/\s+/g, ' ');
    const erro = this.catalogo.adicionarCurso(this.novoCurso);
    if (erro) {
      this.erroCurso = erro;
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Curso cadastrado', nome);
    this.aviso = `Curso "${nome}" cadastrado.`;
    this.novoCurso = '';
    this.erroCurso = '';
    this.carregar();
  }

  removerCurso(item: ItemCurso) {
    const erro = this.catalogo.removerCurso(item.nome);
    if (erro) {
      this.erroCurso = erro;
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Curso removido', item.nome);
    this.aviso = `Curso "${item.nome}" removido.`;
    this.erroCurso = '';
    this.carregar();
  }

  adicionarOrientador() {
    const nome = this.novoOrientador.trim().replace(/\s+/g, ' ');
    const erro = this.catalogo.adicionarOrientador(this.novoOrientador);
    if (erro) {
      this.erroOrientador = erro;
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Orientador cadastrado', nome);
    this.aviso = `Orientador(a) "${nome}" cadastrado(a).`;
    this.novoOrientador = '';
    this.erroOrientador = '';
    this.carregar();
  }

  removerOrientador(nome: string) {
    this.catalogo.removerOrientador(nome);
    this.atividades.registrar(this.nomeAdmin, 'Orientador removido', nome);
    this.aviso = `Orientador(a) "${nome}" removido(a).`;
    this.carregar();
  }

  private carregar() {
    this.cursos = this.catalogo.listarCursos().map((nome) => ({
      nome,
      trabalhos: this.catalogo.trabalhosDoCurso(nome),
    }));
    this.orientadores = this.catalogo.listarOrientadores();
  }
}