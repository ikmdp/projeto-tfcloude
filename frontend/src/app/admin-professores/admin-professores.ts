import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Professores } from '../servicos/professores';
import { Envios } from '../servicos/envios';
import { Atividades } from '../servicos/atividades';
import { Sessao } from '../servicos/sessao';

interface ItemProfessor {
  nome: string;
  email: string;
  trabalhos: number;
}

@Component({
  selector: 'app-admin-professores',
  imports: [FormsModule],
  templateUrl: './admin-professores.html',
  styleUrl: './admin-professores.css',
})
export class AdminProfessores implements OnInit {
  private professores = inject(Professores);
  private envios = inject(Envios);
  private atividades = inject(Atividades);
  private sessao = inject(Sessao);

  lista: ItemProfessor[] = [];

  novoNome = '';
  novoEmail = '';
  erro = '';
  aviso = '';

  removendo: string | null = null; // e-mail do professor que está sendo removido

  ngOnInit() {
    this.carregar();
  }

  private get nomeAdmin(): string {
    return this.sessao.usuario?.nome ?? 'Coordenação';
  }

  adicionar() {
    const nome = this.novoNome.trim().replace(/\s+/g, ' ');
    const email = this.novoEmail.trim().toLowerCase();

    const erro = this.professores.adicionar(this.novoNome, this.novoEmail);
    if (erro) {
      this.erro = erro;
      return;
    }

    this.atividades.registrar(this.nomeAdmin, 'Professor cadastrado', `${nome} · ${email}`);
    this.aviso = `${nome} agora pode acessar a área de professores com o e-mail ${email}.`;
    this.novoNome = '';
    this.novoEmail = '';
    this.erro = '';
    this.carregar();
  }

  pedirRemocao(item: ItemProfessor) {
    this.removendo = item.email;
    this.aviso = '';
  }

  cancelarRemocao() {
    this.removendo = null;
  }

  confirmarRemocao(item: ItemProfessor) {
    this.professores.remover(item.email);
    this.atividades.registrar(this.nomeAdmin, 'Professor removido', `${item.nome} · ${item.email}`);
    this.aviso = `${item.nome} foi removido e perdeu o acesso à área de professores.`;
    this.removendo = null;
    this.carregar();
  }

  private carregar() {
    this.lista = this.professores.listar().map((p) => ({
      nome: p.nome,
      email: p.email,
      trabalhos: this.envios.listar(p.email).length,
    }));
  }
}