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
  novoCurso = '';
  erro = '';
  aviso = '';

  ngOnInit() {
    this.carregar();
  }

  private get nomeAdmin(): string {
    return this.sessao.usuario?.nome ?? 'Coordenação';
  }

  adicionar() {
    const nome = this.novoCurso.trim().replace(/\s+/g, ' ');
    const erro = this.catalogo.adicionarCurso(this.novoCurso);
    if (erro) {
      this.erro = erro;
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Curso cadastrado', nome);
    this.aviso = `Curso "${nome}" cadastrado.`;
    this.novoCurso = '';
    this.erro = '';
    this.carregar();
  }

  remover(item: ItemCurso) {
    const erro = this.catalogo.removerCurso(item.nome);
    if (erro) {
      this.erro = erro;
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Curso removido', item.nome);
    this.aviso = `Curso "${item.nome}" removido.`;
    this.erro = '';
    this.carregar();
  }

  private carregar() {
    this.cursos = this.catalogo.listarCursos().map((nome) => ({
      nome,
      trabalhos: this.catalogo.trabalhosDoCurso(nome),
    }));
  }
}